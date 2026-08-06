<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Event;
use App\Models\EventNegosiasi;
use App\Models\Notifikasi;
use App\Support\SlotMeeting;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Negosiasi lanjutan atas penawaran yang diajukan klien sebelum menerimanya.
 *
 * Sebelumnya permintaan penyesuaian hanya dikirim sebagai email ke PIC tanpa
 * meninggalkan catatan, sehingga tidak ada daftar yang bisa ditindaklanjuti dan
 * klien tidak pernah tahu permintaannya sudah ditangani atau belum.
 */
class NegosiasiController extends Controller
{
    use ChecksPegawaiRole;

    /** Banyaknya riwayat yang ditampilkan di bawah antrean. */
    private const RIWAYAT = 30;

    public function index()
    {
        $this->checkEventMarketing();

        $relasi = [
            // penawaran_ditinjau_pada ikut diambil karena dari situlah diketahui
            // apakah baris ini masih menahan penawaran klien — lihat baris().
            'event:id_event,nama_event,status_event,penawaran_status,penawaran_ditinjau_pada,tgl_mulai_event,area_event,jumlah_pax,deal_harga_event,id_client,id_pegawai',
            'event.pic:id_pegawai,nama_pegawai',
            'client:id,nama_client,perusahaan_client,email_client',
            // Kolom usulan ikut diperlukan, jadi appointment dimuat utuh.
            'appointment',
            'penangan:id_pegawai,nama_pegawai',
        ];

        // HANYA permintaan yang belum ditanggapi. Sengaja tidak memakai
        // menungguTim() — cakupannya kini juga meliputi UsulanKlien, dan itu
        // sudah punya antreannya sendiri di bawah. Memakainya di sini membuat
        // satu negosiasi tampil dua kali pada halaman yang sama.
        // Ketiga antrean menyaring acara batal, sama seperti lencana di menu —
        // aturan yang berbeda antara keduanya membuat lencana menunjuk daftar
        // yang isinya tidak ada.
        $menunggu = EventNegosiasi::with($relasi)
            ->where('status', EventNegosiasi::DIAJUKAN)->acaraMasihAda()
            ->orderBy('created_at')->get()->map(fn ($n) => $this->baris($n));

        // Klien menawar jadwal lain — giliran tim memutuskan.
        $usulan = EventNegosiasi::with($relasi)
            ->where('status', EventNegosiasi::USULAN_KLIEN)->acaraMasihAda()
            ->orderBy('updated_at')->get()->map(fn ($n) => $this->baris($n));

        // Sudah dijadwalkan, tinggal menunggu klien menerimanya.
        $menungguKlien = EventNegosiasi::with($relasi)
            ->where('status', EventNegosiasi::DIJADWALKAN)->acaraMasihAda()
            ->orderBy('updated_at')->get()->map(fn ($n) => $this->baris($n));

        // Jadwal sudah disepakati kedua pihak. Yang ditunggu pertemuannya
        // sendiri, lalu pencatatan hasilnya yang menutup pembahasan.
        $menungguMeeting = EventNegosiasi::with($relasi)
            ->where('status', EventNegosiasi::MENUNGGU_MEETING)->acaraMasihAda()
            ->orderBy('updated_at')->get()->map(fn ($n) => $this->baris($n));

        $sudahTampil = $menunggu->pluck('id')
            ->merge($usulan->pluck('id'))
            ->merge($menungguKlien->pluck('id'))
            ->merge($menungguMeeting->pluck('id'))->all();

        $riwayat = EventNegosiasi::with($relasi)
            ->whereNotIn('id', $sudahTampil)
            ->orderByDesc('updated_at')->take(self::RIWAYAT)
            ->get()->map(fn ($n) => $this->baris($n));

        return Inertia::render('EventMarketing/Negosiasi/Index', [
            'menunggu'        => $menunggu->values(),
            'usulan'          => $usulan->values(),
            'menungguKlien'   => $menungguKlien->values(),
            'menungguMeeting' => $menungguMeeting->values(),
            'riwayat'         => $riwayat->values(),
        ]);
    }

    /**
     * Rentang jam yang masih kosong pada satu tanggal.
     *
     * Dipanggil dari formulir penawaran jadwal supaya tim melihat kapan saja
     * masih lowong sebelum menentukan jamnya, tanpa harus menebak lalu ditolak.
     */
    public function ketersediaan(Request $request)
    {
        $this->checkEventMarketing();

        $data = $request->validate(['tgl' => ['required', 'date']]);

        return response()->json([
            'tanggal' => $data['tgl'],
            'rentang' => SlotMeeting::rentangKosong($data['tgl']),
        ]);
    }

    /**
     * Tim membalas permintaan klien. Bila disertai jadwal pertemuan, sebuah
     * appointment dibuat sekaligus agar slotnya benar-benar terpesan dan tampil
     * pada kalender — bukan sekadar tanggal yang dicatat di negosiasi ini.
     */
    public function balas(Request $request, $id)
    {
        $this->checkEventMarketing();

        // Kolom jam memakai Event::ATURAN_JAM — aturan yang sama dipakai di
        // seluruh sistem sejak isian jam ngawur pernah lolos sampai ke pengurai
        // tanggal. Wajib dalam bentuk array karena regexnya mengandung "|".
        // Tanggalnya tidak boleh di masa lalu: menawarkan pertemuan pada hari
        // yang sudah lewat hanya membuat klien menekan "Terima" untuk jadwal
        // yang mustahil dihadiri.
        $data = $request->validate([
            'balasan'      => ['required', 'string', 'min:5', 'max:1000'],
            'jadwalkan'    => ['nullable', 'boolean'],
            'tgl_meeting'  => ['nullable', 'required_if:jadwalkan,true,1', 'date', 'after_or_equal:today'],
            'jam_meeting'  => ['nullable', 'required_if:jadwalkan,true,1', 'string', 'max:8', Event::ATURAN_JAM],
        ], [
            'balasan.required'          => 'Tuliskan tanggapan untuk klien.',
            'tgl_meeting.required_if'   => 'Pilih tanggal pertemuannya.',
            'tgl_meeting.after_or_equal' => 'Tanggal pertemuan tidak boleh di masa lalu.',
            'jam_meeting.required_if'   => 'Pilih jam pertemuannya.',
            'jam_meeting.regex'         => 'Jam pertemuan harus berformat HH:MM.',
        ]);

        $negosiasi = EventNegosiasi::with('event')->findOrFail($id);

        if ($negosiasi->status !== EventNegosiasi::DIAJUKAN) {
            throw ValidationException::withMessages([
                'balasan' => 'Permintaan ini sudah ditangani (status: ' . $negosiasi->status . ').',
            ]);
        }

        $jadwalkan = $request->boolean('jadwalkan');
        $pegawai   = Auth::guard('pegawai')->id();

        // Tim menentukan jam secara BEBAS — tidak dipaksa ke enam slot baku
        // milik klien, sebab pembahasan penawaran justru perlu menyesuaikan
        // waktu klien. Yang tetap dijaga: bukan Minggu, di dalam jam kerja, dan
        // tidak bertabrakan dengan pertemuan lain maupun jadwal acara.
        if ($jadwalkan) {
            SlotMeeting::periksaBebas($data['tgl_meeting'], $data['jam_meeting'], null, 'tgl_meeting', 'jam_meeting');
        }

        DB::transaction(function () use ($negosiasi, $data, $jadwalkan, $pegawai) {
            $appointment = null;

            if ($jadwalkan) {
                $event = $negosiasi->event;

                // Dibuat berstatus Pending supaya slotnya langsung tertahan.
                // Tanggal usulan ditaruh pada kolom request karena itulah yang
                // dibaca penentu slot selama konfirmasi belum ada.
                $appointment = Appointment::create([
                    'client_id'       => $negosiasi->client_id,
                    'jenis_event'     => $event->kategori_event ?: 'Pembahasan Penawaran',
                    'deskripsi_event' => 'Pembahasan lanjutan penawaran acara "' . $event->nama_event . '".',
                    'tgl_request'     => $data['tgl_meeting'],
                    'jam_request'     => $data['jam_meeting'],
                    'status'          => 'Pending',
                    'catatan_em'      => 'Dijadwalkan dari negosiasi penawaran.',
                    'id_pegawai'      => $pegawai,
                    'id_event'        => $event->id_event,
                ]);
            }

            $negosiasi->update([
                'status'         => $jadwalkan ? EventNegosiasi::DIJADWALKAN : EventNegosiasi::DIJAWAB,
                'balasan'        => trim($data['balasan']),
                'id_appointment' => $appointment?->id,
                'ditangani_oleh' => $pegawai,
                'ditangani_pada' => now(),
            ]);

            $this->jejak($negosiasi->event, $jadwalkan
                ? 'Tim membalas negosiasi dan menawarkan pertemuan '
                    . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('d M Y')
                    . ' pukul ' . substr($data['jam_meeting'], 0, 5) . '.'
                : 'Tim membalas negosiasi klien.');

            $this->kabariKlien($negosiasi, $jadwalkan, $data);
        });

        return back()->with('success', $jadwalkan
            ? 'Balasan terkirim beserta usulan jadwal pertemuan. Menunggu klien menerimanya.'
            : 'Balasan terkirim ke klien.');
    }

    /**
     * Tim MENERIMA jadwal yang diusulkan klien. Pertemuan langsung disepakati:
     * appointment-nya berpindah ke tanggal usulan dan negosiasinya tuntas.
     */
    public function terimaUsulan($id)
    {
        $this->checkEventMarketing();

        $negosiasi = EventNegosiasi::with(['appointment', 'event'])->findOrFail($id);

        if ($negosiasi->status !== EventNegosiasi::USULAN_KLIEN) {
            throw ValidationException::withMessages([
                'usulan' => 'Tidak ada usulan jadwal dari klien yang menunggu keputusan.',
            ]);
        }

        $apt = $negosiasi->appointment;
        if (! $apt || blank($apt->usulan_tgl)) {
            throw ValidationException::withMessages(['usulan' => 'Usulan jadwalnya tidak ditemukan.']);
        }

        $tgl = \Illuminate\Support\Carbon::parse($apt->usulan_tgl)->toDateString();
        $jam = substr((string) $apt->usulan_jam, 0, 5);

        // Slot bisa saja terisi acara lain sejak klien mengusulkannya, jadi
        // kelayakannya dinilai ULANG di sini — bukan saat usulan dikirim.
        SlotMeeting::periksaBebas($tgl, $jam, $apt->id, 'usulan', 'usulan');

        DB::transaction(function () use ($negosiasi, $apt, $tgl, $jam) {
            $apt->update([
                'tgl_konfirmasi' => $tgl,
                'jam_konfirmasi' => $jam,
                'status'         => 'Dikonfirmasi',
                'usulan_tgl'     => null,
                'usulan_jam'     => null,
                'usulan_catatan' => null,
                'id_pegawai'     => Auth::guard('pegawai')->id(),
            ]);

            // Sama seperti ketika klien yang menerima jadwal: yang disepakati
            // baru waktunya. Selesai ditetapkan setelah hasil pertemuan dicatat.
            $negosiasi->update(['status' => EventNegosiasi::MENUNGGU_MEETING]);

            $this->jejak($negosiasi->event,
                'Usulan jadwal klien diterima, pembahasan '
                . \Illuminate\Support\Carbon::parse($tgl)->translatedFormat('d M Y') . ' pukul ' . $jam . '.');
        });

        $this->kabariJadwal($negosiasi, '✅ Jadwal Pembahasan Disepakati',
            'Tim kami menyetujui usulan jadwal Anda. Pembahasan penawaran "'
            . $negosiasi->event?->nama_event . '" dijadwalkan pada '
            . \Illuminate\Support\Carbon::parse($tgl)->translatedFormat('l, d F Y') . ' pukul ' . $jam . '.');

        return back()->with('success', 'Usulan klien diterima. Pertemuan sudah terjadwal.');
    }

    /**
     * Tim MENOLAK usulan klien dan menawarkan jadwal pengganti. Tawar-menawar
     * berlanjut sampai keduanya bertemu di jadwal yang sama.
     */
    public function tolakUsulan(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'alasan'      => ['required', 'string', 'min:5', 'max:500'],
            'tgl_meeting' => ['required', 'date', 'after_or_equal:today'],
            'jam_meeting' => ['required', 'string', 'max:8', Event::ATURAN_JAM],
        ], [
            'alasan.required'            => 'Sertakan alasan agar klien memahami penolakannya.',
            'tgl_meeting.required'       => 'Tawarkan tanggal penggantinya.',
            'tgl_meeting.after_or_equal' => 'Tanggal pengganti tidak boleh di masa lalu.',
            'jam_meeting.required'       => 'Tawarkan jam penggantinya.',
            'jam_meeting.regex'          => 'Jam pertemuan harus berformat HH:MM.',
        ]);

        $negosiasi = EventNegosiasi::with(['appointment', 'event'])->findOrFail($id);

        if ($negosiasi->status !== EventNegosiasi::USULAN_KLIEN) {
            throw ValidationException::withMessages([
                'alasan' => 'Tidak ada usulan jadwal dari klien yang menunggu keputusan.',
            ]);
        }

        $apt = $negosiasi->appointment;
        SlotMeeting::periksaBebas($data['tgl_meeting'], $data['jam_meeting'], $apt?->id, 'tgl_meeting', 'jam_meeting');

        $jam = substr($data['jam_meeting'], 0, 5);

        DB::transaction(function () use ($negosiasi, $apt, $data, $jam) {
            $apt?->update([
                'tgl_request'    => $data['tgl_meeting'],
                'jam_request'    => $jam,
                'tgl_konfirmasi' => null,
                'jam_konfirmasi' => null,
                'status'         => 'Pending',
                'usulan_tgl'     => null,
                'usulan_jam'     => null,
                'usulan_catatan' => null,
                'catatan_em'     => trim($data['alasan']),
                'id_pegawai'     => Auth::guard('pegawai')->id(),
            ]);

            // Kembali menunggu klien — giliran berpindah lagi.
            $negosiasi->update([
                'status'         => EventNegosiasi::DIJADWALKAN,
                'ditangani_oleh' => Auth::guard('pegawai')->id(),
                'ditangani_pada' => now(),
            ]);

            $this->jejak($negosiasi->event,
                'Usulan klien belum cocok, tim menawarkan '
                . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('d M Y') . ' pukul ' . $jam . '.');
        });

        $this->kabariJadwal($negosiasi, '🔄 Usulan Jadwal Baru dari Tim',
            'Usulan jadwal Anda belum dapat kami penuhi. ' . trim($data['alasan'])
            . "\n\nSebagai gantinya kami menawarkan "
            . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('l, d F Y')
            . ' pukul ' . $jam . ". Silakan terima atau usulkan waktu lain lewat portal.");

        return back()->with('success', 'Jadwal pengganti dikirim ke klien. Menunggu tanggapannya.');
    }

    /** Pemberitahuan perubahan jadwal ke klien — surel + notifikasi portal. */
    private function kabariJadwal(EventNegosiasi $negosiasi, string $judul, string $pesan): void
    {
        if ($negosiasi->client_id) {
            Notifikasi::create([
                'judul'        => $judul,
                'pesan'        => $pesan,
                'tipe'         => 'negosiasi',
                'reference_id' => $negosiasi->id,
                'client_id'    => $negosiasi->client_id,
                'is_read'      => false,
            ]);
        }

        if ($email = $negosiasi->client?->email_client) {
            try {
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    $judul,
                    subjudul: $negosiasi->event?->nama_event,
                    ikon:     str_contains($judul, 'Disepakati') ? '✅' : '🔄',
                    nada:     str_contains($judul, 'Disepakati') ? 'hijau' : 'jingga',
                    sapaan:   'Halo, ' . ($negosiasi->client?->nama_client ?? 'Klien') . '!',
                    paragraf: [$pesan],
                    subjek:   $judul,
                ));
            } catch (\Exception $e) {
                \Log::warning('Email jadwal negosiasi gagal: ' . $e->getMessage());
            }
        }
    }

    /**
     * Catat hasil pertemuan, dan barulah negosiasinya dinyatakan selesai.
     *
     * Inilah penutup alur pembahasan: jadwal disepakati, pertemuan berlangsung,
     * hasilnya dicatat. Sebelum langkah ini negosiasi tetap berstatus
     * MenungguMeeting, sehingga penawaran revisi belum dapat diajukan dan
     * penawaran yang terpampang tetap tertahan bagi klien.
     */
    public function catatHasilMeeting(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'hasil' => ['required', 'string', 'min:5', 'max:5000'],
        ], ['hasil.required' => 'Tuliskan hasil pembahasannya.']);

        $negosiasi = EventNegosiasi::with(['appointment', 'event'])->findOrFail($id);

        if ($negosiasi->status !== EventNegosiasi::MENUNGGU_MEETING) {
            throw ValidationException::withMessages([
                'hasil' => 'Hasil pertemuan hanya dapat dicatat setelah jadwalnya disepakati kedua pihak.',
            ]);
        }

        // Pertemuannya belum terjadi, jadi belum ada hasil yang bisa dicatat.
        if (! $negosiasi->meetingSudahLewat()) {
            throw ValidationException::withMessages([
                'hasil' => 'Pertemuannya belum berlangsung. Hasil baru dapat dicatat setelah waktunya lewat.',
            ]);
        }

        DB::transaction(function () use ($negosiasi, $data) {
            // Hasilnya menempel pada appointment-nya supaya terbaca pula dari
            // riwayat pertemuan, bukan hanya dari halaman negosiasi.
            $negosiasi->appointment?->update([
                'catatan_meeting' => trim($data['hasil']),
                'status'          => 'Selesai',
            ]);

            $negosiasi->update([
                'status'         => EventNegosiasi::SELESAI,
                'ditangani_oleh' => Auth::guard('pegawai')->id(),
                'ditangani_pada' => now(),
            ]);

            $this->jejak($negosiasi->event,
                'Pembahasan penawaran selesai. Hasil: ' . trim($data['hasil']));
        });

        $this->kabariJadwal($negosiasi, '✅ Hasil Pembahasan Dicatat',
            'Pembahasan penawaran acara "' . $negosiasi->event?->nama_event
            . '" telah selesai. Hasil pembahasan: ' . trim($data['hasil'])
            . "\n\nTim kami akan menindaklanjutinya.");

        return back()->with('success',
            'Hasil pertemuan tercatat. Pembahasan selesai, penawaran revisi kini dapat diajukan.');
    }

    /**
     * Tutup permintaan yang tidak perlu dilanjutkan.
     *
     * Berlaku juga untuk pembahasan yang sudah Selesai, dan itu disengaja:
     * selama sebuah negosiasi belum ditutup, penawaran yang terpampang tetap
     * tertahan bagi klien (lihat Event::menungguRevisi()). Pembahasan yang
     * berakhir tanpa perubahan harga karena itu harus bisa ditutup — kalau
     * tidak, penawarannya terkunci selamanya sebab satu-satunya pelepas kunci
     * yang lain adalah persetujuan penawaran revisi yang tak akan pernah ada.
     */
    public function tutup(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ], ['alasan.required' => 'Sertakan alasan penutupan agar tercatat.']);

        $negosiasi = EventNegosiasi::with('event')->findOrFail($id);

        if ($negosiasi->status === EventNegosiasi::DITUTUP) {
            throw ValidationException::withMessages([
                'alasan' => 'Permintaan ini sudah ditutup sebelumnya.',
            ]);
        }

        // Tawaran pertemuan yang belum terjadi dilepas bersama penutupannya —
        // slotnya tidak boleh tetap terkunci untuk pembahasan yang dihentikan.
        // Pertemuan yang sudah berlangsung (Selesai) dibiarkan sebagai riwayat.
        $apt = $negosiasi->appointment;
        if ($apt && in_array($apt->status, Appointment::STATUS_AKTIF, true)) {
            $apt->update([
                'status'         => 'Dibatalkan',
                'usulan_tgl'     => null,
                'usulan_jam'     => null,
                'usulan_catatan' => null,
            ]);
        }

        $negosiasi->update([
            'status'         => EventNegosiasi::DITUTUP,
            'balasan'        => trim($data['alasan']),
            'ditangani_oleh' => Auth::guard('pegawai')->id(),
            'ditangani_pada' => now(),
        ]);

        $this->jejak($negosiasi->event, 'Negosiasi ditutup: ' . trim($data['alasan']));

        return back()->with('success', $negosiasi->event?->menungguRevisi()
            ? 'Permintaan negosiasi ditutup.'
            : 'Permintaan negosiasi ditutup. Penawaran yang berlaku kini dapat diterima klien kembali.');
    }

    /** Catat jejaknya pada riwayat acara supaya urutannya tetap satu tempat. */
    private function jejak(Event $event, string $teks): void
    {
        $event->catatJejak($teks);
    }

    private function kabariKlien(EventNegosiasi $negosiasi, bool $jadwalkan, array $data): void
    {
        $event = $negosiasi->event;
        $judul = $jadwalkan ? '📅 Usulan Jadwal Pembahasan Penawaran' : '💬 Tanggapan atas Permintaan Anda';

        $pesan = "Tim kami menanggapi permintaan penyesuaian penawaran \"{$event->nama_event}\".\n\n"
               . trim($data['balasan']);

        if ($jadwalkan) {
            $pesan .= "\n\nUsulan jadwal pembahasan: "
                . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('l, d F Y')
                . ' pukul ' . substr($data['jam_meeting'], 0, 5)
                . ".\nSilakan buka portal untuk menerima jadwal tersebut.";
        }

        if ($negosiasi->client_id) {
            Notifikasi::create([
                'judul'        => $judul,
                'pesan'        => $pesan,
                'tipe'         => 'negosiasi',
                'reference_id' => $negosiasi->id,
                'client_id'    => $negosiasi->client_id,
                'is_read'      => false,
            ]);
        }

        // Email gagal tidak boleh menggagalkan balasannya — dicatat saja.
        if ($email = $negosiasi->client?->email_client) {
            try {
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    $jadwalkan ? 'Usulan Jadwal Pembahasan' : 'Tanggapan atas Permintaan Anda',
                    subjudul: $event->nama_event,
                    ikon:     $jadwalkan ? '📅' : '💬',
                    nada:     $jadwalkan ? 'biru' : 'emas',
                    sapaan:   'Halo, ' . ($negosiasi->client?->nama_client ?? 'Klien') . '!',
                    paragraf: ['Tim kami menanggapi permintaan penyesuaian penawaran Anda.'],
                    catatan:  trim($data['balasan']),
                    sorotan:  $jadwalkan
                        ? \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('l, d F Y')
                            . ' pukul ' . substr($data['jam_meeting'], 0, 5)
                        : null,
                    detail:   array_filter([
                        'Acara'           => $event->nama_event,
                        'Nilai penawaran' => 'Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.'),
                    ]),
                    penutup:  $jadwalkan
                        ? 'Silakan buka portal untuk menerima jadwal tersebut, atau usulkan waktu lain bila belum cocok.'
                        : null,
                    subjek:   $jadwalkan ? 'Usulan jadwal pembahasan' : 'Tanggapan permintaan penyesuaian',
                ));
            } catch (\Exception $e) {
                \Log::warning('Email balasan negosiasi gagal: ' . $e->getMessage());
            }
        }
    }

    /** Bentuk satu baris untuk halaman, termasuk hal yang hanya diketahui model. */
    private function baris(EventNegosiasi $n): array
    {
        $apt = $n->appointment;

        return [
            'id'         => $n->id,
            'id_event'   => $n->id_event,
            'nama_event' => $n->event?->nama_event,
            'status_event' => $n->event?->status_event,
            'nilai'      => (float) ($n->event?->deal_harga_event ?? 0),
            'pax'        => $n->event?->jumlah_pax,
            'area'       => $n->event?->area_event,
            'client'     => $n->client?->perusahaan_client ?: $n->client?->nama_client,
            'client_pic' => $n->client?->nama_client,
            'pic'        => $n->event?->pic?->nama_pegawai,

            // Penawaran kedua sesudah pembahasan. Tim mengajukannya dari sini
            // supaya tidak perlu kembali ke papan pipeline hanya untuk itu,
            // dengan syarat yang sama persis seperti ajukanUlangPenawaran().
            //
            // Syarat tambahan: pembahasannya memang sudah SELESAI. Penawaran
            // revisi yang diajukan sebelum pertemuannya berlangsung tidak punya
            // dasar, sebab yang hendak direvisi justru hasil pembahasan itu.
            'boleh_revisi' => $n->status === EventNegosiasi::SELESAI
                && $n->event
                && $n->event->penawaran_status === Event::PENAWARAN_DISETUJUI
                && in_array($n->event->status_event,
                    [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL], true),

            // Pertemuannya sudah lewat, hasilnya tinggal dicatat.
            'boleh_catat_hasil' => $n->meetingSudahLewat(),
            'hasil_meeting'     => $apt?->catatan_meeting,

            'pesan'         => $n->pesan,
            'minta_meeting' => $n->minta_meeting,
            'status'        => $n->status,
            'balasan'       => $n->balasan,

            // Selama baris ini belum ditutup DAN lebih baru daripada
            // persetujuan penawaran terakhir, klien tidak dapat menerima
            // penawaran yang terpampang. Ditandai supaya tim melihat pembahasan
            // mana yang masih menahan keputusan klien — termasuk yang sudah
            // Selesai, yang tanpa penanda ini tampak beres padahal mengunci.
            'menahan' => $n->status !== EventNegosiasi::DITUTUP
                && $n->event
                && ($n->event->penawaran_ditinjau_pada === null
                    || $n->created_at?->greaterThan($n->event->penawaran_ditinjau_pada)),

            'diajukan_pada'  => $n->created_at?->translatedFormat('d M Y H:i'),
            'menunggu_sejak' => in_array($n->status, EventNegosiasi::PERLU_TIM, true)
                ? $n->updated_at?->diffForHumans(null, true) : null,
            'ditangani_oleh' => $n->penangan?->nama_pegawai,
            'ditangani_pada' => $n->ditangani_pada?->translatedFormat('d M Y H:i'),

            'id_appointment' => $apt?->id,

            'meeting' => $apt?->jadwalBerlaku() ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($apt->jadwalBerlaku()['tgl'])->translatedFormat('d M Y'),
                'jam'     => $apt->jadwalBerlaku()['jam'],
                'status'  => $apt->status,
            ] : null,

            // Klien menawar hari lain. Ditandai di sini supaya tim tidak perlu
            // membuka halaman Appointment satu per satu untuk mengetahuinya.
            'usulan_klien' => filled($apt?->usulan_tgl) ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($apt->usulan_tgl)->translatedFormat('d M Y'),
                'jam'     => substr((string) $apt->usulan_jam, 0, 5),
                'catatan' => $apt->usulan_catatan,
            ] : null,
        ];
    }
}
