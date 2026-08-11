<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentDiterima;
use App\Models\Appointment;
use App\Models\BuktiPembayaran;
use App\Models\Event;
use App\Traits\BuatKwitansi;
use App\Traits\KabariRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Events\AppointmentCreated;
use App\Events\BuktiPembayaranUploaded;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    use BuatKwitansi;
    use KabariRole;

    public function index()
    {
        $client = Auth::guard('client')->user();

        $appointments = Appointment::with('pegawai')
            // Pembahasan penawaran tidak ditampilkan di tab Appointment: alur
            // terima/usulkan jadwalnya berbeda dan sepenuhnya dijalankan dari
            // panel penawaran, sehingga menampilkannya di dua tempat justru
            // memberi klien dua tombol berbeda untuk pertemuan yang sama.
            ->whereDoesntHave('negosiasi')
            ->where('client_id', $client->id)
            ->latest()
            ->take(50)
            ->get();

        // Event milik client ini yang sudah terikat komitmen: Deal (menunggu DP),
        // Upcoming (berjalan), dan Done (selesai). Prospek pipeline (Lead/Negotiation)
        // dan event batal tidak ditampilkan. Deal disertakan agar client bisa
        // melihat & mengunduh invoice DP-nya lalu mengunggah bukti pembayaran.
        $events = Event::where('id_client', $client->id)
            ->untukFinance()
            ->with([
                'pic',
                'invoices' => fn($q) => $q->orderBy('tgl_terbit'),
                'buktiPembayaran' => fn($q) => $q->where('client_id', $client->id),
                // To-do persiapan acara — hanya kolom yang aman ditampilkan ke
                // klien (tanpa PIC per tugas maupun catatan internal), agar klien
                // bisa memantau sejauh mana persiapan acaranya.
                'tugas' => fn($q) => $q
                    ->select('id_tugas', 'id_event', 'nama_tugas', 'kategori', 'status_tugas', 'progress', 'deadline_tugas', 'urutan')
                    ->orderBy('urutan')->orderBy('id_tugas'),
                // Permintaan ganti tanggal yang sedang ditinjau Manajemen (bila ada).
                'rescheduleMenunggu',
            ])
            ->latest('tgl_mulai_event')
            ->take(50)
            ->get();

        // Satu jalur kontak per acara: PIC acara. Klien tidak dihadapkan pada
        // daftar pelaksana per tugas — cukup satu orang yang memang ditunjuk
        // menangani acaranya, dan itu juga menjaga kontak pegawai lain tetap
        // internal.
        //
        // Nomor mentahnya TIDAK ikut dikirim ke browser: klien hanya mendapat
        // tautan siap tekan, bukan nomor yang bisa dipanen.
        $events->each(function (Event $event) use ($client) {
            // Persentase kesiapan dihitung di server memakai rumus bersama,
            // bukan disusun ulang di halaman. Dua tempat yang menghitung
            // sendiri-sendiri sudah pernah menghasilkan dua angka berbeda
            // untuk acara yang sama.
            $event->progres_persen = \App\Models\Tugas::persenSiap($event->tugas);

            $event->wa_pic = \App\Support\Wa::link(
                $event->pic?->no_hp_pegawai,
                $this->pesanTanyaProgres($event, $client),
            );

            if ($event->pic) {
                $event->pic->makeHidden('no_hp_pegawai');
            }
        });

        // Penawaran = event eksternal milik client yang masih di tahap Negotiation.
        // Klien bisa melihat detail ringkas + PDF harga, lalu menerima/menolak.
        $penawaran = Event::where('id_client', $client->id)
            ->eksternal()
            ->where('status_event', Event::STATUS_NEGOTIATION)
            // Hanya penawaran yang sudah disetujui Manajemen yang tampil.
            ->where('penawaran_status', Event::PENAWARAN_DISETUJUI)
            ->with('pic:id_pegawai,nama_pegawai')
            ->latest('updated_at')
            ->get();

        // Penawaran yang sedang dibahas ulang tidak boleh bisa diterima. Klien
        // sudah meminta penyesuaian, jadi angka pada dokumen yang terpampang
        // belum tentu berlaku — yang mengikat nanti adalah dokumen revisinya.
        //
        // Penandanya perbandingan waktu, bukan sekadar ada tidaknya negosiasi:
        // negosiasi yang lebih tua daripada persetujuan terakhir berarti sudah
        // dijawab oleh penawaran yang sekarang terpampang. Negosiasi yang
        // ditutup tanpa revisi juga tidak menahan, sebab penawaran semula
        // memang tetap berlaku.
        $negoTerakhir = \App\Models\EventNegosiasi::whereIn('id_event', $penawaran->pluck('id_event'))
            ->where('status', '!=', \App\Models\EventNegosiasi::DITUTUP)
            ->selectRaw('id_event, MAX(created_at) AS terakhir')
            ->groupBy('id_event')
            ->pluck('terakhir', 'id_event');

        $penawaran->each(function ($e) use ($negoTerakhir) {
            $nego = $negoTerakhir[$e->id_event] ?? null;

            $e->setAttribute('menunggu_revisi', $nego !== null && (
                $e->penawaran_ditinjau_pada === null
                || \Illuminate\Support\Carbon::parse($nego)->greaterThan($e->penawaran_ditinjau_pada)
            ));
        });

        // Hitungan acara dipisah tegas. "Total event" sebelumnya menjumlahkan
        // yang sudah selesai dengan yang baru disepakati, jadi angkanya tidak
        // bisa dibaca. Dihitung dari query sendiri, bukan dari $events di atas,
        // karena daftar itu disaring untukFinance() (Deal ke atas) dan dibatasi
        // 50 baris — acara yang masih Lead/Negotiation tidak akan ikut terhitung.
        $milikKlien = fn () => Event::where('id_client', $client->id);

        $praDeal = [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION];
        $proses  = [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION, Event::STATUS_DEAL,
                    Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN];

        return Inertia::render('Client/Dashboard', [
            // Rekening tujuan pembayaran — ditampilkan pada panel Pembayaran
            // supaya klien tak perlu menanyakan ke mana harus mentransfer.
            'rekening'          => config('perusahaan.bank'),
            // Negosiasi lanjutan yang sedang berjalan: klien perlu melihat
            // permintaannya sudah ditanggapi atau belum, dan menerima jadwal
            // pembahasan bila tim menawarkannya.
            'negosiasi'         => \App\Models\EventNegosiasi::with('appointment')
                ->where('client_id', $client->id)
                ->berjalan()
                ->latest()
                ->get()
                ->map(fn ($n) => $this->barisNegosiasi($n))
                ->values(),

            // Pembahasan yang sudah tuntas maupun ditutup. Klien perlu dapat
            // menelusuri kembali apa yang pernah ia minta beserta jawabannya,
            // sebab satu penawaran bisa melewati beberapa putaran pembahasan.
            'negosiasiRiwayat'  => \App\Models\EventNegosiasi::with('appointment')
                ->where('client_id', $client->id)
                ->whereIn('status', [
                    \App\Models\EventNegosiasi::SELESAI,
                    \App\Models\EventNegosiasi::DITUTUP,
                ])
                ->latest()
                ->take(20)
                ->get()
                ->map(fn ($n) => $this->barisNegosiasi($n))
                ->values(),

            'appointments'      => $appointments,
            'events'            => $events,
            'penawaran'         => $penawaran,
            'slots'             => self::workingSlots(),
            'totalAppointments' => $appointments->count(),
            'totalEvents'       => $events->count(),
            'eventDone'         => $milikKlien()->where('status_event', Event::STATUS_DONE)->count(),
            'eventProses'       => $milikKlien()->whereIn('status_event', $proses)->count(),
            'eventPraDeal'      => $milikKlien()->whereIn('status_event', $praDeal)->count(),
        ]);
    }

    /**
     * Template pesan klien untuk menanyakan progres acara kepada PIC-nya.
     * Disiapkan lengkap — nama acara, tanggal, dan capaian persiapannya — supaya
     * klien tidak perlu menjelaskan ulang, dan nadanya seragam & sopan.
     */
    private function pesanTanyaProgres(Event $event, $client): string
    {
        $tanggal = $event->tgl_mulai_event
            ? \Illuminate\Support\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
            : null;

        $asal = filled($client->perusahaan_client) ? " dari {$client->perusahaan_client}" : '';

        $pesan  = 'Halo ' . ($event->pic?->nama_pegawai ?: 'Kak') . ', saya '
                . ($client->nama_client ?: 'klien') . "{$asal}.\n\n";
        $pesan .= "Saya ingin menanyakan progres persiapan acara *{$event->nama_event}*"
                . ($tanggal ? " ({$tanggal})" : '') . '.';

        $total = $event->tugas->count();
        if ($total > 0) {
            $selesai = $event->tugas->where('status_tugas', 'Done')->count();
            $pesan  .= "\n\nDi portal saya terlihat {$selesai} dari {$total} bagian persiapan sudah selesai.";
        }

        $pesan .= "\n\nBagaimana perkembangannya ya? Terima kasih banyak. 🙏";

        return $pesan;
    }

    /**
     * Slot meeting valid: 09:00–16:30, selang 1,5 jam (meeting 30 menit + jeda 1
     * jam), sehingga jadwal jadi 09:00, 10:30, 12:00, 13:30, 15:00, 16:30.
     * Dipakai backend (validasi) & frontend (pemilih jam) agar konsisten.
     */
    public static function workingSlots(): array
    {
        return \App\Support\SlotMeeting::kerja();
    }

    /**
     * Slot meeting yang terhalang jadwal acara pada satu tanggal.
     * Aturannya tinggal di App\Support\SlotMeeting agar sisi tim memakai yang sama.
     */
    public static function slotTerhalangEvent(string $tgl): array
    {
        return \App\Support\SlotMeeting::terhalangEvent($tgl);
    }

    /** Status appointment yang dianggap "menempati" slot (untuk cek bentrok). */
    private const SLOT_BLOCKING_STATUS = \App\Support\SlotMeeting::STATUS_MENEMPATI;

    /** Validasi: bukan Minggu, jam dalam slot kerja, dan tidak bentrok. */
    private function validateSlot(string $tgl, string $jam, ?int $kecualiId = null): void
    {
        \App\Support\SlotMeeting::periksa($tgl, $jam, $kecualiId);
    }

    /** JSON: daftar jam yang sudah dipesan pada satu tanggal (untuk disable di dropdown). */
    /**
     * Ketersediaan sebulan penuh: berapa slot sudah terpakai per tanggal.
     *
     * Dipakai kalender pemilih jadwal supaya klien langsung melihat hari mana
     * yang masih longgar tanpa menebak-nebak — satu permintaan untuk sebulan,
     * bukan satu per tanggal.
     */
    public function ketersediaan(Request $request)
    {
        $request->validate(['bulan' => 'required|date_format:Y-m']);

        $awal  = \Illuminate\Support\Carbon::createFromFormat('Y-m', $request->bulan)->startOfMonth();
        $akhir = $awal->copy()->endOfMonth();

        $slotKerja = self::workingSlots();

        // Jam appointment yang sudah terpakai, dikelompokkan per tanggal. Yang
        // dibaca adalah JADWAL BERLAKU (hasil konfirmasi bila sudah ada), bukan
        // jam yang semula diminta — kalau tidak, jadwal yang sudah dipindahkan
        // tim tetap mengunci slot lamanya dan slot barunya terlihat kosong.
        // Data lama bisa menyimpan jam di luar slot kerja — disaring agar tidak
        // salah hitung.
        $aptPerTgl = Appointment::query()
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->whereRaw(Appointment::SQL_TGL_BERLAKU . ' BETWEEN ? AND ?', [$awal->toDateString(), $akhir->toDateString()])
            ->whereRaw(Appointment::SQL_JAM_BERLAKU . ' IS NOT NULL')
            ->selectRaw(Appointment::SQL_TGL_BERLAKU . ' as tgl_slot')
            ->selectRaw(Appointment::SQL_JAM_BERLAKU . ' as jam_slot')
            ->get()
            ->groupBy(fn ($a) => \Illuminate\Support\Carbon::parse($a->tgl_slot)->toDateString())
            ->map(fn ($g) => $g->map(fn ($a) => substr((string) $a->jam_slot, 0, 5))
                ->filter(fn ($j) => in_array($j, $slotKerja, true))->unique()->values()->all());

        // Slot terpakai per tanggal = gabungan slot appointment + slot yang
        // terhalang jadwal acara, agar badge kalender mencerminkan sisa yang benar.
        $terpakai = [];
        for ($d = $awal->copy(); $d->lte($akhir); $d->addDay()) {
            $tgl     = $d->toDateString();
            $unavail = array_unique(array_merge($aptPerTgl[$tgl] ?? [], self::slotTerhalangEvent($tgl)));
            if ($unavail) {
                $terpakai[$tgl] = count($unavail);
            }
        }

        return response()->json([
            'terpakai' => $terpakai,
            'total'    => count($slotKerja),
        ]);
    }

    public function bookedSlots(Request $request)
    {
        $request->validate(['tgl' => 'required|date']);

        // Dibaca dari jadwal BERLAKU, sejalan dengan ketersediaan() di atas.
        $booked = Appointment::query()
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->whereRaw(Appointment::SQL_TGL_BERLAKU . ' = ?', [\Illuminate\Support\Carbon::parse($request->tgl)->toDateString()])
            ->whereRaw(Appointment::SQL_JAM_BERLAKU . ' IS NOT NULL')
            ->selectRaw(Appointment::SQL_JAM_BERLAKU . ' as jam_slot')
            ->pluck('jam_slot')
            ->map(fn ($t) => substr((string) $t, 0, 5))
            ->values()
            ->all();

        return response()->json([
            'booked'       => $booked,
            // Slot yang bentrok dengan jadwal acara — dibedakan agar labelnya jelas.
            'eventBlocked' => self::slotTerhalangEvent($request->tgl),
        ]);
    }

    public function create()
    {
        $client = Auth::guard('client')->user();

        // Wajib lengkapi profil dulu — terutama akun Google yang otomatis tanpa
        // data ini. Nama perusahaan hanya wajib untuk klien tipe Perusahaan.
        if (! $client->profilLengkap()) {
            $kurang = $client->perluPerusahaan() ? 'nama perusahaan dan nomor HP' : 'nomor HP';
            return redirect()->route('client.profile')
                ->with('warning', "Lengkapi {$kurang} terlebih dahulu sebelum membuat appointment.");
        }

        $hasActive = Appointment::where('client_id', $client->id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->exists();

        return Inertia::render('Client/Appointment/Create', [
            'has_active_appointment' => $hasActive,
            'missing_phone'          => empty($client->no_telp_client),
            'missing_company'        => $client->perluPerusahaan() && empty($client->perusahaan_client),
            'slots'                  => self::workingSlots(),
        ]);
    }

    /**
     * Batas laju per klien untuk aksi yang memicu email ke tim (buat
     * appointment, usul jadwal, minta penyesuaian penawaran). Jendelanya satu
     * jam; pesan galat ditaruh di kolom yang relevan pada tiap form.
     */
    private function batasiLaju(string $kunci, int $maks, string $field): void
    {
        if (RateLimiter::tooManyAttempts($kunci, $maks)) {
            $detik = RateLimiter::availableIn($kunci);
            throw ValidationException::withMessages([
                $field => "Terlalu banyak permintaan. Coba lagi dalam {$detik} detik.",
            ]);
        }

        RateLimiter::hit($kunci, 3600);
    }

    public function store(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 5 appointment baru per jam per client
        $this->batasiLaju('appointment-store:' . $client->id, 5, 'jenis_event');

        // Blokir jika profil belum lengkap (perusahaan hanya wajib utk tipe Perusahaan)
        if (! $client->profilLengkap()) {
            return back()->withErrors([
                'jenis_event' => 'Lengkapi profil (' . ($client->perluPerusahaan() ? 'nama perusahaan dan nomor HP' : 'nomor HP') . ') di profil terlebih dahulu.',
            ]);
        }

        $request->validate([
            'jenis_event'     => 'required|string|max:255',
            'deskripsi_event' => 'nullable|string|max:5000',
            'jumlah_tamu'     => 'nullable|integer|min:1|max:100000',
            'estimasi_budget' => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_request'     => ['required', 'date', 'after:today'],
            'jam_request'     => ['required', 'date_format:H:i'],
        ], [
            'tgl_request.after'       => 'Tanggal meeting harus setelah hari ini.',
            'jam_request.required'    => 'Pilih jam meeting.',
            'jam_request.date_format' => 'Format jam tidak valid.',
        ]);

        // Validasi jam kerja (Senin–Sabtu, slot selang 1,5 jam 09:00–16:30) + cek bentrok
        $this->validateSlot($request->tgl_request, $request->jam_request);

        // Backstop race condition: bila dua klien menembus pemeriksaan di atas
        // nyaris bersamaan, unique index slot_key menolak yang kedua (error 1062).
        try {
            $appointment = Appointment::create([
                ...$request->only([
                    'jenis_event', 'deskripsi_event', 'jumlah_tamu',
                    'estimasi_budget', 'tgl_request', 'jam_request',
                ]),
                'client_id' => $client->id,
                'status'    => 'Pending',
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw ValidationException::withMessages([
                    'jam_request' => 'Maaf, slot ini baru saja dipesan klien lain. Silakan pilih jam lain.',
                ]);
            }
            throw $e;
        }

        // Load relasi client untuk email
        $appointment->load('client');

        // Kirim email konfirmasi penerimaan ke client
        if ($appointment->client?->email_client) {
            try {
                Mail::to($appointment->client->email_client)
                    ->send(new AppointmentDiterima($appointment));
            } catch (\Exception $e) {
                // Email gagal tidak menghentikan proses — log saja
                \Log::warning('Email AppointmentDiterima gagal: ' . $e->getMessage());
            }
        }

        try {
            broadcast(new AppointmentCreated($appointment))->toOthers();
        } catch (\Exception $e) {
            \Log::warning('Broadcast AppointmentCreated gagal: ' . $e->getMessage());
        }

        return redirect()->route('client.dashboard')
            ->with('success', 'Appointment berhasil dibuat! Tim kami akan segera menghubungi Anda untuk konfirmasi.');
    }

    public function destroy(Request $request, $id)
    {
        $request->validate([
            'alasan' => 'required|string|min:5|max:500',
        ]);

        $appointment = Appointment::where('id', $id)
            ->where('client_id', Auth::guard('client')->id())
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->firstOrFail();

        $appointment->update([
            'status'               => 'Dibatalkan',
            'alasan_batal_client'  => $request->alasan,
            // Usulan yang menggantung ikut dibersihkan — tidak ada lagi jadwal
            // yang bisa diubah, jadi tim tak perlu meninjaunya.
            'usulan_tgl'     => null,
            'usulan_jam'     => null,
            'usulan_catatan' => null,
        ]);

        return back()->with('success', 'Appointment berhasil dibatalkan.');
    }

    /**
     * Klien mengusulkan jadwal meeting alternatif (reschedule dua arah).
     * Usulan disimpan terpisah dari jadwal berjalan — jadwal yang sudah ada tetap
     * berlaku sampai tim meninjau & mengonfirmasi usulan ini.
     */
    public function usulJadwal(Request $request, $id)
    {
        $client = Auth::guard('client')->user();

        // Tiap usulan mengirim email ke PIC — dibatasi seperti pembuatan
        // appointment, agar tidak bisa dipakai membanjiri kotak masuk tim.
        $this->batasiLaju('appointment-usul:' . $client->id, 10, 'usulan_jam');

        $data = $request->validate([
            'usulan_tgl'     => ['required', 'date', 'after:today'],
            'usulan_jam'     => ['required', 'date_format:H:i'],
            'usulan_catatan' => ['nullable', 'string', 'max:500'],
        ], [
            'usulan_tgl.after'    => 'Tanggal usulan harus setelah hari ini.',
            'usulan_jam.required' => 'Pilih jam usulan.',
        ]);

        $appointment = Appointment::where('id', $id)
            ->where('client_id', $client->id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->firstOrFail();

        // Slot usulan harus jam kerja, bukan Minggu, dan belum dipakai appointment
        // lain maupun jadwal acara. Appointment ini sendiri dikecualikan supaya
        // klien tidak dihalangi oleh jadwalnya sendiri.
        //
        // Usulan sengaja TIDAK mengunci slot: ia baru sebuah permintaan yang
        // mungkin tidak disetujui, dan mengunci slot yang belum tentu terpakai
        // akan menutup jadwal bagi klien lain. Kelayakannya dinilai ulang saat
        // tim mengonfirmasi — lihat ManagesAppointment::konfirmasiAppointment.
        \App\Support\SlotMeeting::periksa(
            $data['usulan_tgl'],
            $data['usulan_jam'],
            $appointment->id,
            'usulan_tgl',
            'usulan_jam',
        );

        $appointment->update([
            'usulan_tgl'     => $data['usulan_tgl'],
            'usulan_jam'     => $data['usulan_jam'],
            'usulan_catatan' => $data['usulan_catatan'] ?? null,
        ]);

        // Kabari PIC yang menangani (bila sudah ada) lewat email — tabel Notifikasi
        // hanya untuk klien, jadi staf internal dikabari via email.
        if ($appointment->id_pegawai && ($email = optional($appointment->pegawai)->email_pegawai)) {
            $tglUsul = \Illuminate\Support\Carbon::parse($data['usulan_tgl'])->translatedFormat('d F Y');
            try {
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    'Usulan Jadwal Meeting dari Klien',
                    subjudul: $appointment->jenis_event,
                    ikon:     '🔄',
                    nada:     'jingga',
                    paragraf: ['Klien mengusulkan jadwal pertemuan yang berbeda dari yang ditetapkan tim.'],
                    sorotan:  $tglUsul . ' pukul ' . $data['usulan_jam'],
                    detail:   array_filter([
                        'Klien'        => $client->nama_client,
                        'Jenis'        => $appointment->jenis_event,
                        'Usulan klien' => $tglUsul . ', ' . $data['usulan_jam'],
                    ]),
                    catatan:  $data['usulan_catatan'] ?? null,
                    penutup:  'Silakan tinjau dan konfirmasi melalui menu Appointment.',
                    subjek:   'Usulan jadwal dari klien — ' . $appointment->jenis_event,
                ));
            } catch (\Exception $e) {
                \Log::warning('Email usulan jadwal gagal: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Usulan jadwal terkirim. Tim kami akan meninjau dan mengonfirmasi.');
    }

    /**
     * Tagihan yang sedang ditunggu pembayarannya untuk sebuah event.
     * Dipakai sebagai cadangan bila klien mengunggah tanpa memilih invoice —
     * mis. dari tautan lama — supaya buktinya tetap punya tujuan yang jelas.
     */
    private function invoiceTertagih($idEvent): ?int
    {
        return \App\Models\Invoice::where('id_event', $idEvent)
            ->where('status', \App\Models\Invoice::STATUS_BELUM)
            ->orderBy('id_invoice')
            ->value('id_invoice');
    }

    public function uploadBukti(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 10 upload per jam per client (mencegah disk flooding).
        // Yang DIHITUNG hanyalah unggahan yang benar-benar tersimpan; pemotongan
        // kuotanya karena itu berada di bawah, setelah semua penolakan lewat.
        // Sebelumnya kuota dipotong di sini, sehingga sepuluh berkas yang justru
        // ditolak sistem sendiri (gambar tak terbaca sebagai bukti transfer)
        // mengunci klien selama satu jam tanpa satu pun bukti tersimpan.
        $rateLimitKey = 'bukti-upload:' . $client->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return back()->withErrors([
                'file_bukti' => "Terlalu banyak upload. Coba lagi dalam {$seconds} detik.",
            ]);
        }

        $request->validate([
            // Pastikan event milik client yang login — cegah IDOR.
            //
            // Tahapnya ikut dijaga, bukan kepemilikannya saja. Portal klien
            // hanya menampilkan acara yang sudah terikat kesepakatan, sehingga
            // tanpa penjagaan ini seseorang masih dapat melampirkan bukti pada
            // acaranya sendiri yang sudah DIBATALKAN atau yang masih sebatas
            // prospek — uangnya lalu masuk buku kas atas acara yang tidak
            // pernah ada kewajiban membayarnya.
            'id_event'    => ['required', Rule::exists('events', 'id_event')
                ->where('id_client', $client->id)
                ->whereIn('status_event', \App\Models\Event::STATUS_BERKOMITMEN)],
            // Invoice yang dibayar harus milik event yang sama, supaya bukti
            // tidak bisa dikaitkan ke tagihan event lain.
            'id_invoice'  => ['nullable', Rule::exists('invoices', 'id_invoice')->where('id_event', $request->id_event)],
            'file_bukti'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            // WAJIB, dan harus lebih dari nol. Dulu boleh kosong, padahal
            // verifikasi Finance menyalin nilai ini ke transaksis.nominal yang
            // NOT NULL — buktinya masuk, lalu tidak akan pernah bisa
            // diverifikasi karena tombolnya selalu berakhir galat 500. Nominal
            // juga dasar pencocokan OCR dan penilaian kurang bayar di bawah.
            'nominal'     => 'required|numeric|min:1|max:9999999999999',
            'keterangan'  => 'nullable|string|max:500',
        ], [
            'nominal.required' => 'Isi nominal yang Anda transfer.',
            'nominal.min'      => 'Nominal pembayaran harus lebih dari nol.',
        ]);

        // ── Aturan pembayaran: DP dan pelunasan dibayar penuh sekali transfer ──
        // Unggahan yang nominalnya kurang TIDAK ditolak, sebab yang tertulis pada
        // formulir belum tentu sama dengan yang benar-benar ditransfer — klien
        // bisa saja salah ketik, atau membayar dari dua rekening. Menolaknya di
        // sini berarti menghukum kekeliruan pengetikan. Kekurangannya cukup
        // ditandai supaya terbaca klien maupun Tim Finance, dan Finance yang
        // memutuskan saat verifikasi.
        $idInvoice = $request->id_invoice ?: $this->invoiceTertagih($request->id_event);
        $kurangBayar = null;

        if ($idInvoice && filled($request->nominal)) {
            $invoice = \App\Models\Invoice::find($idInvoice);

            if ($invoice) {
                // Yang sudah tertutup bukti lain — termasuk yang masih menunggu
                // verifikasi, agar dua unggahan separuh tidak terbaca lunas.
                $sudah = (float) BuktiPembayaran::where('id_invoice', $invoice->id_invoice)
                    ->whereIn('status', ['Menunggu', 'Diverifikasi'])
                    ->sum('nominal');

                $kurang = (float) $invoice->nominal - $sudah;

                if ($kurang > 0 && (float) $request->nominal + 0.01 < $kurang) {
                    $kurangBayar = [
                        'tipe'    => $invoice->tipe,
                        'seharusnya' => $kurang,
                        'selisih' => $kurang - (float) $request->nominal,
                    ];
                }
            }
        }

        $file     = $request->file('file_bukti');
        $filename = $file->hashName();
        Storage::disk('local')->putFileAs('bukti-pembayaran', $file, $filename);
        $path = 'bukti-pembayaran/' . $filename;

        // ── Pembacaan otomatis bukti transfer (OCR, berjalan di server sendiri) ──
        // Perannya menyaring & membantu, bukan memutuskan. Verifikasi akhir tetap
        // di Finance; OCR tidak pernah meloloskan pembayaran secara otomatis.
        $ocr = \App\Support\OcrBukti::baca(Storage::disk('local')->path($path));

        // Konservatif: hanya ditolak bila tidak ada satu pun tanda transaksi
        // (tanpa nominal, tanpa kata kunci transfer). Pesannya mengarahkan
        // klien mengunggah ulang, bukan menuduh.
        if (\App\Support\OcrBukti::bukanBuktiTransfer($ocr)) {
            Storage::disk('local')->delete($path);

            return back()->withErrors([
                'file_bukti' => 'Kami tidak menemukan keterangan transaksi pada gambar ini. '
                    . 'Mohon unggah tangkapan layar atau foto bukti transfer yang jelas — '
                    . 'pastikan nominal dan keterangan transaksinya terbaca.',
            ]);
        }

        $nominalDiisi = $request->nominal ? (float) $request->nominal : null;
        $cocok        = \App\Support\OcrBukti::cocokkanNominal($ocr, $nominalDiisi);
        $ocrNominal   = \App\Support\OcrBukti::nominalUtama($ocr);

        $ocrStatus = match (true) {
            ! $ocr['didukung'] => 'Tidak Dinilai',
            $cocok === true    => 'Cocok',
            $cocok === false   => 'Selisih',
            default            => 'Tidak Terbaca',
        };

        // Berkasnya benar-benar disimpan → barulah kuota unggah dipotong.
        RateLimiter::hit($rateLimitKey, 3600);

        BuktiPembayaran::create([
            'id_event'    => $request->id_event,
            'id_invoice'  => $request->id_invoice ?: $this->invoiceTertagih($request->id_event),
            'client_id'   => $client->id,
            'file_bukti'  => $path,
            'nominal'     => $request->nominal,
            'keterangan'  => $request->keterangan,
            'status'      => 'Menunggu',
            'ocr_nominal' => $ocrNominal,
            'ocr_status'  => $ocrStatus,
            'ocr_teks'    => $ocr['teks'] ?: null,
        ]);

        // Kirim notifikasi ke Finance + broadcast WebSocket
        $event = \App\Models\Event::find($request->id_event);
        $notifikasi = \App\Models\Notifikasi::create([
            'judul'        => 'Bukti Pembayaran Baru',
            'pesan'        => ($client->nama_client ?? 'Client') . ' mengupload bukti pembayaran untuk event "' . ($event?->nama_event ?? '-') . '"' .
                              ($request->nominal ? ' sebesar Rp ' . number_format($request->nominal, 0, ',', '.') : '') . '.',
            'tipe'         => 'bukti_pembayaran',
            'reference_id' => $request->id_event,
            'is_read'      => false,
        ]);
        try {
            BuktiPembayaranUploaded::dispatch($notifikasi);
        } catch (\Exception $e) {
            \Log::warning('Broadcast BuktiPembayaranUploaded gagal: ' . $e->getMessage());
        }

        // Pesan disesuaikan dengan hasil pembacaan — tetap menegaskan bahwa
        // verifikasi Finance yang menentukan.
        $pesan = match ($ocrStatus) {
            'Cocok' => 'Bukti terbaca Rp ' . number_format((float) $ocrNominal, 0, ',', '.')
                     . ' dan cocok dengan nominal yang Anda isi. Menunggu verifikasi Finance.',
            'Selisih' => 'Bukti berhasil diupload. Catatan: nominal yang terbaca sistem Rp '
                     . number_format((float) $ocrNominal, 0, ',', '.')
                     . ' berbeda dari yang Anda isi. Tim Finance akan memeriksanya.',
            default => 'Bukti pembayaran berhasil diupload. Menunggu verifikasi Finance.',
        };

        // Kekurangan terhadap tagihan disampaikan terus terang, supaya klien
        // tahu tagihannya belum tertutup dan tidak menunggu status lunas yang
        // tak kunjung datang.
        if ($kurangBayar) {
            $pesan .= ' Perlu diketahui, tagihan ' . $kurangBayar['tipe'] . ' seharusnya dibayar penuh '
                . 'sebesar Rp ' . number_format($kurangBayar['seharusnya'], 0, ',', '.')
                . ' dalam satu kali transfer, sedangkan nominal yang Anda isi masih kurang Rp '
                . number_format($kurangBayar['selisih'], 0, ',', '.')
                . '. Bukti Anda tetap kami terima dan Tim Finance akan memeriksanya.';
        }

        return back()->with('success', $pesan);
    }

    public function deleteBukti($id)
    {
        $bukti = BuktiPembayaran::where('id', $id)
            ->where('client_id', Auth::guard('client')->id())
            ->where('status', 'Menunggu')
            ->firstOrFail();

        $filePath = $bukti->file_bukti;

        // Hapus DB record dulu — jika gagal, file tetap aman
        $bukti->delete();

        // Hapus file setelah DB sukses — dengan path traversal guard (konsisten dengan operasi file lain)
        if ($filePath) {
            $baseDir  = realpath(storage_path('app/private/bukti-pembayaran'));
            $fullPath = $baseDir ? realpath(storage_path('app/private/' . $filePath)) : false;
            if ($baseDir && $fullPath && str_starts_with($fullPath, $baseDir . DIRECTORY_SEPARATOR)) {
                @unlink($fullPath);
            }
        }

        return back()->with('success', 'Bukti pembayaran berhasil dihapus.');
    }

    /**
     * Unduh PDF invoice milik client sendiri. Dijaga kepemilikan: invoice harus
     * menempel pada event milik client yang sedang login.
     */
    public function downloadInvoice($id_invoice)
    {
        $client = Auth::guard('client')->user();

        $invoice = \App\Models\Invoice::with('event.client')
            ->whereHas('event', fn($q) => $q->where('id_client', $client->id))
            ->findOrFail($id_invoice);

        $event = $invoice->event;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.invoice', [
            'invoice'       => $invoice,
            'event'         => $event,
            'tglTerbit'     => optional($invoice->tgl_terbit)->translatedFormat('d F Y'),
            'tglJatuhTempo' => optional($invoice->tgl_jatuh_tempo)?->translatedFormat('d F Y'),
            'tglAcara'      => $event->tgl_mulai_event
                ? \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
                : '—',
        ]);

        return $pdf->download(
            'Invoice-' . \Illuminate\Support\Str::slug($invoice->nomor_invoice)
            . '-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf'
        );
    }

    /**
     * Klien membatalkan acaranya sendiri (Deal atau Upcoming).
     *
     * Pembatalan berlaku SEKETIKA — tidak ada rantai persetujuan dan tidak ada
     * refund. Uang muka yang sudah dibayarkan hangus dan tetap tercatat pada
     * buku kas sebagai pendapatan; nilainya disalin ke catatan pembatalan agar
     * terbaca di riwayat. Karena akibatnya tak dapat ditarik kembali, klien
     * wajib menyatakan lebih dulu bahwa ia memahaminya, dan pernyataan itu
     * diperiksa di sisi server.
     *
     * Jalan keluar bagi klien yang hanya berhalangan pada tanggalnya adalah
     * penggantian tanggal (ajukanReschedule) — di situ uang mukanya tetap
     * berlaku, dan hanya itulah yang menunggu persetujuan Manajemen.
     */
    public function ajukanPembatalan(Request $request, $id_event)
    {
        $client = Auth::guard('client')->user();

        $data = $request->validate([
            'alasan'     => 'required|string|min:10|max:1000',
            // Peringatan uang muka hangus harus benar-benar disadari klien.
            // Dijaga di server, bukan hanya lewat centang di layar.
            'konfirmasi' => ['required', 'in:HANGUS'],
        ], [
            'alasan.required'     => 'Mohon sertakan alasan pembatalan.',
            'alasan.min'          => 'Alasan terlalu singkat (minimal 10 karakter).',
            'konfirmasi.required' => 'Centang pernyataan bahwa Anda memahami uang muka akan hangus.',
            'konfirmasi.in'       => 'Konfirmasi tidak sah.',
        ]);

        // Pembatalan hanya berlaku sebelum acara berlangsung. Acara berstatus
        // Penyelesaian tanggalnya sudah lewat dan jasanya sudah dikerjakan;
        // membatalkannya akan menghapus tagihan yang belum dibayar, sehingga
        // klien lolos dari pelunasan atas acara yang sudah terlaksana. Acara
        // berstatus Done sudah tuntas seluruhnya.
        $event = Event::where('id_client', $client->id)
            ->whereIn('status_event', [Event::STATUS_DEAL, Event::STATUS_UPCOMING])
            ->findOrFail($id_event);

        // Status saja tidak cukup — lihat sudahBerlangsung(). Acara yang hari-H
        // nya sudah tiba tetap berstatus Upcoming sampai penjadwal auto-Done
        // berjalan, dan tanpa penjagaan tanggal ini jendela tersebut cukup untuk
        // membatalkan acara yang sudah terlaksana beserta tagihan sisanya.
        if ($event->sudahBerlangsung()) {
            throw ValidationException::withMessages([
                'konfirmasi' => 'Acara ini sudah berlangsung, jadi tidak dapat dibatalkan lagi. '
                    . 'Silakan hubungi tim kami bila ada yang perlu dibicarakan.',
            ]);
        }

        // Uang yang sudah masuk tidak dikembalikan dan TIDAK dihapus dari buku
        // kas — ia menjadi pendapatan atas pembatalan. Nilainya disalin ke
        // catatan pembatalan supaya tetap terbaca di riwayat.
        $hangus = (float) \App\Models\Transaksi::where('id_event', $event->id_event)->sum('nominal');

        \Illuminate\Support\Facades\DB::transaction(function () use ($event, $client, $data, $hangus) {
            \App\Models\EventPembatalan::create([
                'id_event'      => $event->id_event,
                'client_id'     => $client->id,
                'alasan'        => trim($data['alasan']),
                'dp_hangus'     => $hangus,
                'status'        => \App\Models\EventPembatalan::STATUS_SELESAI,
                'diproses_pada' => now(),
            ]);

            // Tagihan yang belum dibayar dibersihkan agar penjadwal pengingat
            // tidak terus menagih acara yang sudah batal.
            \App\Models\Invoice::where('id_event', $event->id_event)
                ->where('status', \App\Models\Invoice::STATUS_BELUM)
                ->delete();

            // Permintaan ganti tanggal yang masih menunggu ikut ditutup. Tanpa
            // ini ia mengendap di antrean Manajemen — ikut terhitung badge, dan
            // bila disetujui akan memindahkan jadwal acara yang sudah batal.
            \App\Models\EventReschedule::where('id_event', $event->id_event)
                ->menunggu()
                ->update([
                    'status'        => \App\Models\EventReschedule::STATUS_DITOLAK,
                    'catatan_tolak' => 'Acara dibatalkan klien sebelum permintaan ini ditinjau.',
                ]);

            // Pembahasan penawaran yang masih berjalan ikut ditutup, dan slot
            // pertemuannya dilepas. Tanpa ini ia mengendap di antrean Event
            // Marketing sementara jam pertemuannya tetap terkunci untuk acara
            // yang sudah tidak ada.
            \App\Models\EventNegosiasi::tutupUntukEvent(
                $event->id_event, 'Acara dibatalkan klien, pembahasan dihentikan.');

            $jejak = 'Dibatalkan klien: ' . trim($data['alasan'])
                . ($hangus > 0 ? ' Uang muka Rp ' . number_format($hangus, 0, ',', '.') . ' hangus.' : '');

            $event->update([
                'status_event' => Event::STATUS_BATAL,
                // Revisi penawaran yang sedang menunggu keputusan Manajemen ikut
                // ditutup — acara Deal boleh mengajukan revisi, jadi keadaan ini
                // benar-benar terjadi. Tanpa pengosongan, pengajuannya mengendap
                // di lencana Manajemen untuk acara yang sudah tidak ada.
                'penawaran_status'  => $event->penawaran_status === Event::PENAWARAN_DIAJUKAN
                    ? null : $event->penawaran_status,
                'penawaran_catatan' => null,
            ]);
            $event->catatJejak($jejak);
        });

        // Pembatalan berlaku seketika, jadi tim dikabari sebagai pemberitahuan —
        // bukan permintaan persetujuan.
        $nilai = $hangus > 0 ? 'Rp ' . number_format($hangus, 0, ',', '.') : 'tidak ada pembayaran masuk';
        foreach (['EventMarketing', 'Finance'] as $peran) {
            $this->kabariRole($peran,
                'Acara Dibatalkan Klien — ' . $event->nama_event,
                'Klien ' . ($client->nama_client ?? '-') . " membatalkan acara \"{$event->nama_event}\".\n\n"
                . 'Alasan: ' . trim($data['alasan']) . "\n\n"
                . "Uang muka yang hangus: {$nilai}.\n\n"
                . 'Acara sudah berstatus Batal dan jadwalnya dilepas. Tagihan yang belum dibayar telah dihapus.'
            );
        }

        return back()->with('success',
            'Acara telah dibatalkan. Sesuai ketentuan, uang muka yang sudah dibayarkan tidak dikembalikan.');
    }

    /**
     * Klien meminta acara DIPINDAH ke tanggal lain — jalan keluar agar uang
     * mukanya tidak hangus. Permintaan ini tidak langsung berlaku: jadwal baru
     * harus disetujui Pihak Manajemen karena menyangkut ketersediaan venue.
     */
    public function ajukanReschedule(Request $request, $id_event)
    {
        $client = Auth::guard('client')->user();

        $data = $request->validate([
            'tgl_baru'         => ['required', 'date', 'after:today'],
            'tgl_selesai_baru' => ['nullable', 'date', 'after_or_equal:tgl_baru'],
            'alasan'           => ['required', 'string', 'min:10', 'max:1000'],
        ], [
            'tgl_baru.required' => 'Pilih tanggal baru untuk acara Anda.',
            'tgl_baru.after'    => 'Tanggal baru harus setelah hari ini.',
            'alasan.required'   => 'Mohon sertakan alasan pemindahan jadwal.',
            'alasan.min'        => 'Alasan terlalu singkat (minimal 10 karakter).',
        ]);

        $event = Event::where('id_client', $client->id)
            ->whereIn('status_event', [Event::STATUS_DEAL, Event::STATUS_UPCOMING])
            ->findOrFail($id_event);

        // Sama seperti pembatalan: acara yang sudah berlangsung tidak bisa
        // dipindahkan lagi, dan statusnya belum tentu ikut berpindah hari itu.
        if ($event->sudahBerlangsung()) {
            throw ValidationException::withMessages([
                'tgl_baru' => 'Acara ini sudah berlangsung, jadwalnya tidak dapat dipindahkan lagi.',
            ]);
        }

        if (\App\Models\EventReschedule::where('id_event', $event->id_event)->menunggu()->exists()) {
            return back()->with('error', 'Sudah ada permintaan ganti tanggal yang sedang ditinjau untuk acara ini.');
        }

        // Bentrok diperiksa lebih awal supaya klien langsung tahu, walau
        // Manajemen tetap memeriksanya ulang saat menyetujui.
        $bentrok = Event::checkBentrok(
            $data['tgl_baru'],
            $event->jam_mulai,
            $event->jam_selesai,
            $event->area_event,
            $event->id_event,
            $data['tgl_selesai_baru'] ?? null,
            $event->loading_in,
            $event->loading_out,
        );

        if ($bentrok) {
            throw ValidationException::withMessages([
                'tgl_baru' => 'Maaf, tanggal tersebut sudah terisi acara lain. Silakan pilih tanggal lain.',
            ]);
        }

        \App\Models\EventReschedule::create([
            'id_event'         => $event->id_event,
            'client_id'        => $client->id,
            'tgl_lama'         => $event->tgl_mulai_event,
            'tgl_baru'         => $data['tgl_baru'],
            'tgl_selesai_baru' => $data['tgl_selesai_baru'] ?? null,
            'alasan'           => trim($data['alasan']),
            'status'           => \App\Models\EventReschedule::STATUS_DIAJUKAN,
        ]);

        $tglBaru = \Illuminate\Support\Carbon::parse($data['tgl_baru'])->translatedFormat('d F Y');
        $event->catatJejak('Klien meminta ganti tanggal ke ' . $tglBaru . ': ' . trim($data['alasan']));

        $this->kabariRole('Manajemen',
            'Permintaan Ganti Tanggal — ' . $event->nama_event,
            'Klien ' . ($client->nama_client ?? '-') . " meminta acara \"{$event->nama_event}\" dipindahkan.\n\n"
            . 'Dari : ' . \Illuminate\Support\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y') . "\n"
            . "Ke   : {$tglBaru}\n\n"
            . 'Alasan: ' . trim($data['alasan']) . "\n\n"
            . 'Silakan tinjau di menu Ganti Tanggal. Uang muka klien tetap berlaku bila disetujui.'
        );

        return back()->with('success',
            'Permintaan ganti tanggal terkirim. Uang muka Anda tetap berlaku sambil menunggu persetujuan tim kami.');
    }

    /**
     * Unduh kwitansi (tanda terima) untuk bukti pembayaran milik sendiri yang
     * sudah diverifikasi Finance.
     */
    public function downloadKwitansi($id)
    {
        $bukti = BuktiPembayaran::where('id', $id)
            ->where('client_id', Auth::guard('client')->id())
            ->where('status', 'Diverifikasi')
            ->firstOrFail();

        return $this->kwitansiPdf($bukti);
    }

    /**
     * Unduh PDF "Detail Event" milik client sendiri — informasi acara lengkap
     * sekaligus ringkasan tagihan (invoice, sudah dibayar, sisa).
     */
    public function downloadDetailEvent($id_event)
    {
        $client = Auth::guard('client')->user();

        $event = Event::where('id_client', $client->id)
            ->untukFinance()
            ->with(['client', 'pic', 'invoices' => fn($q) => $q->orderBy('tgl_terbit'), 'transaksis'])
            ->findOrFail($id_event);

        $totalDibayar = (float) $event->transaksis->sum('nominal');
        $sisa         = max((float) $event->deal_harga_event - $totalDibayar, 0);

        $jamMulai   = substr((string) $event->jam_mulai, 0, 5);
        $jamSelesai = substr((string) $event->jam_selesai, 0, 5);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.detail-event', [
            'event'        => $event,
            'invoices'     => $event->invoices,
            'totalDibayar' => $totalDibayar,
            'sisa'         => $sisa,
            'tglCetak'     => now()->translatedFormat('d F Y'),
            'tglAcara'     => $event->tgl_mulai_event
                ? \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('l, d F Y')
                : '—',
            'jam'          => $jamMulai ? ($jamSelesai ? "{$jamMulai} – {$jamSelesai} WIB" : "{$jamMulai} WIB") : null,
        ]);

        return $pdf->download('Detail-Event-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf');
    }

    /** Ambil event penawaran milik client sendiri (Negotiation/Deal), atau 404. */
    /**
     * Bentuk satu baris negosiasi untuk sisi klien.
     *
     * Dipakai panel yang sedang berjalan maupun riwayatnya, supaya keduanya
     * menampilkan hal yang sama persis dan tidak perlu disamakan dua kali.
     */
    private function barisNegosiasi(\App\Models\EventNegosiasi $n): array
    {
        // Jadwal yang DITAMPILKAN harus jadwal yang berlaku, bukan tanggal
        // usulan pertama. Setelah dijadwalkan ulang, membaca tgl_request saja
        // membuat panel ini terus menunjukkan tanggal lama padahal
        // pertemuannya sudah pindah.
        $berlaku = $n->appointment?->jadwalBerlaku();

        return [
            'id'            => $n->id,
            'id_event'      => $n->id_event,
            'pesan'         => $n->pesan,
            'status'        => $n->status,
            'balasan'       => $n->balasan,
            'diajukan_pada' => $n->created_at?->translatedFormat('d M Y H:i'),
            'selesai_pada'  => $n->status === \App\Models\EventNegosiasi::SELESAI
                ? $n->ditangani_pada?->translatedFormat('d M Y H:i') : null,
            'meeting'       => $berlaku ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($berlaku['tgl'])->translatedFormat('l, d F Y'),
                'jam'     => $berlaku['jam'],
                'status'  => $n->appointment->status,
            ] : null,
            // Catatan tim ketika usulan sebelumnya belum dapat dipenuhi.
            'catatan_tim'   => $n->appointment?->catatan_em,
            'hasil_meeting' => $n->appointment?->catatan_meeting,
            // Usulan klien yang belum ditinjau tim, supaya klien tahu
            // permintaannya sedang berjalan dan tidak mengusulkan berulang kali.
            'usulan' => filled($n->appointment?->usulan_tgl) ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($n->appointment->usulan_tgl)->translatedFormat('l, d F Y'),
                'jam'     => substr((string) $n->appointment->usulan_jam, 0, 5),
            ] : null,
        ];
    }

    private function penawaranMilikClient($id_event, array $status)
    {
        $client = Auth::guard('client')->user();

        return Event::eksternal()
            ->where('id_client', $client->id)
            ->whereIn('status_event', $status)
            // Penawaran baru boleh dilihat & direspon klien setelah disetujui
            // Pihak Manajemen. Penjagaan ditaruh di satu tempat ini agar berlaku
            // untuk unduh dokumen, terima, tolak, maupun ajukan penyesuaian.
            ->where('penawaran_status', Event::PENAWARAN_DISETUJUI)
            ->with(['client', 'pic'])
            ->findOrFail($id_event);
    }

    /** Unduh PDF penawaran (harga) milik client sendiri. */
    public function downloadPenawaran($id_event)
    {
        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL]);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.penawaran', [
            'event'    => $event,
            'nomor'    => 'PNW/' . now()->format('Y/m') . '/' . str_pad((string) $event->id_event, 4, '0', STR_PAD_LEFT),
            'tanggal'  => now()->translatedFormat('d F Y'),
            'tglAcara' => \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y'),
            'jam'      => substr((string) $event->jam_mulai, 0, 5) . ' – ' . substr((string) $event->jam_selesai, 0, 5) . ' WIB',
        ]);

        return $pdf->download('Penawaran-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf');
    }

    /** Klien MENERIMA penawaran → event otomatis pindah ke Deal + notifikasi PIC. */
    public function terimaPenawaran(Request $request, $id_event)
    {
        // Menerima penawaran mengikat klien pada aturan pembayaran, penggantian
        // tanggal, dan pembatalan. Persetujuannya dijaga di server, bukan hanya
        // lewat centang di layar, supaya tidak bisa dilewati.
        $request->validate([
            'setuju_ketentuan' => ['required', 'accepted'],
        ], [
            'setuju_ketentuan.required' => 'Centang pernyataan bahwa Anda menyetujui ketentuan yang berlaku.',
            'setuju_ketentuan.accepted' => 'Centang pernyataan bahwa Anda menyetujui ketentuan yang berlaku.',
        ]);

        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION]);

        // Halaman yang sudah basi bisa saja masih menampilkan tombolnya.
        if ($event->menungguRevisi()) {
            return back()->with('error', 'Permintaan penyesuaian Anda masih dibahas. '
                . 'Penawaran dapat diterima setelah tim mengirimkan penawaran terbarunya.');
        }

        $event->update([
            'status_event'     => Event::STATUS_DEAL,
            'respon_klien'     => 'Diterima',
            'tgl_respon_klien' => now(),
        ]);

        // Persetujuan ketentuan ikut dicatat: bila kelak ada perselisihan soal
        // uang muka yang hangus, waktunya terbaca pada riwayat acara.
        $event->catatJejak('Penawaran diterima klien beserta persetujuan ketentuan '
            . 'pembayaran, penggantian tanggal, dan pembatalan. Acara otomatis pindah ke tahap Deal.');

        // Konsisten dengan alur pipeline: appointment terkait ditandai Selesai.
        Appointment::where('id_event', $event->id_event)
            ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
            ->update(['status' => 'Selesai']);

        // Pembahasan yang masih menggantung sudah tidak ada gunanya: yang
        // dibahas justru sudah disetujui. Termasuk tawaran pertemuan yang belum
        // dijawab klien — slotnya dilepas supaya tidak mengunci jam yang tak
        // akan dipakai.
        \App\Models\EventNegosiasi::tutupUntukEvent(
            $event->id_event, 'Klien menerima penawaran, pembahasan selesai dengan sendirinya.');

        // Deal → invoice DP terbit otomatis (sama seperti jalur pipeline).
        \App\Models\Invoice::terbitkanDpOtomatis($event->refresh());

        $this->kabariPicPenawaran($event, 'diterima');

        return back()->with('success', 'Terima kasih! Penawaran telah Anda terima. Tim kami akan segera menindaklanjuti ke tahap berikutnya (uang muka).');
    }

    /** Klien MENOLAK penawaran → tetap Negotiation, PIC diberi tahu untuk tindak lanjut. */
    public function tolakPenawaran(Request $request, $id_event)
    {
        $data = $request->validate(['alasan' => 'nullable|string|max:500']);

        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION]);

        // Sama seperti penerimaan: penawaran yang sedang dibahas ulang belum
        // punya angka final, jadi belum ada yang layak ditolak.
        if ($event->menungguRevisi()) {
            return back()->with('error', 'Permintaan penyesuaian Anda masih dibahas. '
                . 'Tunggu penawaran terbarunya sebelum memutuskan.');
        }

        $jejak = 'Penawaran ditolak klien'
            . (filled($data['alasan'] ?? null) ? ': ' . trim($data['alasan']) : '.');

        $event->update([
            'respon_klien'     => 'Ditolak',
            'tgl_respon_klien' => now(),
        ]);

        $event->catatJejak($jejak);

        $this->kabariPicPenawaran($event, 'ditolak', $data['alasan'] ?? null);

        return back()->with('success', 'Penawaran telah Anda tolak. Tim kami akan menindaklanjuti.');
    }

    /**
     * Klien mengajukan penyesuaian / negosiasi lanjutan atas penawaran (tanpa
     * menolak). Isi permintaan direkam di jejak acara dan dikirim ke PIC; bila
     * klien ingin membahas langsung, ia bisa menandai minta meeting ulang.
     * Penawaran tetap di tahap Negotiation sehingga bisa diterima/ditolak nanti.
     */
    public function ajukanPenyesuaian(Request $request, $id_event)
    {
        // Tiap permintaan mengirim email ke PIC — dibatasi lajunya.
        $this->batasiLaju('penawaran-penyesuaian:' . Auth::guard('client')->id(), 10, 'pesan');

        $data = $request->validate([
            'pesan'         => 'required|string|min:5|max:1000',
            'minta_meeting' => 'boolean',
        ], ['pesan.required' => 'Sampaikan bagian yang ingin disesuaikan.']);

        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION]);
        $mintaMeeting = $request->boolean('minta_meeting');

        // Permintaan boleh lebih dari satu sekaligus. Klien yang teringat hal
        // lain sebelum permintaan pertamanya tuntas tidak perlu menunggu, dan
        // masing-masing tercatat sebagai baris tersendiri sehingga keduanya
        // terlihat tim maupun klien beserta riwayatnya. Sebelumnya permintaan
        // kedua ditolak, sehingga hal yang ingin disampaikan justru hilang.
        $jejak = '💬 Klien minta penyesuaian penawaran (' . now()->translatedFormat('d M Y H:i') . '): ' . trim($data['pesan'])
            . ($mintaMeeting ? ' [minta dijadwalkan meeting ulang]' : '');

        // Dicatat sebagai baris tersendiri, bukan sekadar jejak teks: tim perlu
        // daftar yang bisa ditindaklanjuti dan klien perlu tahu status
        // permintaannya. Jejak pada catatan acara tetap ditulis agar riwayat
        // acara terbaca utuh dalam satu tempat.
        \App\Models\EventNegosiasi::create([
            'id_event'      => $event->id_event,
            'client_id'     => Auth::guard('client')->id(),
            'pesan'         => trim($data['pesan']),
            'minta_meeting' => $mintaMeeting,
            'status'        => \App\Models\EventNegosiasi::DIAJUKAN,
        ]);

        $event->update(['tgl_respon_klien' => now()]);
        $event->catatJejak($jejak);

        if ($email = $event->pic?->email_pegawai) {
            $isi = "Klien meminta PENYESUAIAN atas penawaran acara \"{$event->nama_event}\".\n\n"
                 . 'Permintaan: ' . trim($data['pesan'])
                 . ($mintaMeeting ? "\n\nKlien juga meminta dijadwalkan MEETING ULANG untuk membahas." : '')
                 . "\n\nSilakan tindak lanjuti — sesuaikan penawaran lalu kirim ulang, atau jadwalkan meeting.\n\n"
                 . '— Sistem Laksamana Muda';
            try {
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    'Permintaan Penyesuaian Penawaran',
                    subjudul: $event->nama_event,
                    ikon:     '💬',
                    nada:     'jingga',
                    paragraf: ['Klien meminta penyesuaian atas penawaran yang sudah dikirimkan.'],
                    detail:   array_filter([
                        'Acara'          => $event->nama_event,
                        'Klien'          => $event->client?->nama_client,
                        'Nilai saat ini' => 'Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.'),
                        'Minta pertemuan'=> $mintaMeeting ? 'Ya' : 'Tidak',
                    ]),
                    catatan:  trim($data['pesan']),
                    penutup:  'Tanggapi dari menu Negosiasi Klien — sesuaikan penawaran, atau tawarkan jadwal pembahasan.',
                    subjek:   'Permintaan penyesuaian — ' . $event->nama_event,
                ));
            } catch (\Exception $e) {
                \Log::warning('Email penyesuaian penawaran gagal: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Permintaan penyesuaian terkirim. Tim kami akan menindaklanjuti'
            . ($mintaMeeting ? ' dan menjadwalkan meeting ulang.' : '.'));
    }

    /**
     * Klien menerima jadwal pembahasan yang ditawarkan tim.
     *
     * Appointment-nya sudah dibuat sejak tim membalas — di sini statusnya
     * dinaikkan menjadi Dikonfirmasi dan jadwal berlakunya ditetapkan, sehingga
     * pertemuan itu tampil pada kalender seperti appointment lain.
     */
    public function terimaJadwalNegosiasi($id)
    {
        $negosiasi = \App\Models\EventNegosiasi::with(['appointment', 'event'])
            ->where('client_id', Auth::guard('client')->id())
            ->findOrFail($id);

        // Hanya ketika giliran memang ada di klien. Bila ia sudah mengusulkan
        // waktu lain, giliran berpindah ke tim — menerima jadwal lama di saat
        // itu justru membatalkan usulannya sendiri secara diam-diam.
        if ($negosiasi->status !== \App\Models\EventNegosiasi::DIJADWALKAN) {
            return back()->with('error', $negosiasi->status === \App\Models\EventNegosiasi::USULAN_KLIEN
                ? 'Usulan jadwal Anda sedang ditinjau tim. Mohon tunggu tanggapannya.'
                : 'Tidak ada usulan jadwal yang menunggu persetujuan Anda.');
        }

        $apt = $negosiasi->appointment;
        if (! $apt) {
            return back()->with('error', 'Jadwal pertemuannya tidak ditemukan. Silakan hubungi tim kami.');
        }

        DB::transaction(function () use ($negosiasi, $apt) {
            $apt->update([
                'status'         => 'Dikonfirmasi',
                'tgl_konfirmasi' => $apt->tgl_request,
                'jam_konfirmasi' => $apt->jam_request,
            ]);

            // Yang disepakati baru waktunya, pembahasannya belum terjadi.
            // Negosiasi baru dinyatakan selesai setelah tim mencatat hasil
            // pertemuannya, dan barulah penawaran revisi boleh diajukan.
            $negosiasi->update(['status' => \App\Models\EventNegosiasi::MENUNGGU_MEETING]);

            $jejak = 'Klien menerima jadwal pembahasan penawaran.';
            $negosiasi->event?->catatJejak($jejak);
        });

        $this->kabariRole('EventMarketing',
            '✅ Jadwal Pembahasan Diterima — ' . ($negosiasi->event?->nama_event ?? '-'),
            'Klien menerima usulan jadwal pembahasan penawaran pada '
            . \Illuminate\Support\Carbon::parse($apt->tgl_request)->translatedFormat('l, d F Y')
            . ' pukul ' . substr($apt->jam_request, 0, 5) . ".\n\n"
            . 'Pertemuan sudah tercatat pada daftar appointment.');

        return back()->with('success', 'Jadwal pembahasan diterima. Sampai jumpa di pertemuan tersebut.');
    }

    /**
     * Klien mengusulkan jadwal pembahasan yang lain.
     *
     * Giliran berpindah ke tim: jadwal lama BELUM berubah, dan klien tidak lagi
     * ditawari menerima sampai timnya memutuskan. Tanpa perpindahan giliran ini,
     * klien bisa mengusulkan tanggal baru lalu menekan "Terima" pada tanggal
     * lama, dan kedua sisi melihat jadwal yang berbeda.
     */
    public function usulJadwalNegosiasi(Request $request, $id)
    {
        $data = $request->validate([
            'usulan_tgl'     => ['required', 'date', 'after_or_equal:today'],
            'usulan_jam'     => ['required', 'string', 'max:8', Event::ATURAN_JAM],
            'usulan_catatan' => ['nullable', 'string', 'max:500'],
        ], [
            'usulan_tgl.required'       => 'Pilih tanggal yang Anda usulkan.',
            'usulan_tgl.after_or_equal' => 'Tanggal usulan tidak boleh di masa lalu.',
            'usulan_jam.required'       => 'Pilih jam yang Anda usulkan.',
        ]);

        $negosiasi = \App\Models\EventNegosiasi::with(['appointment', 'event'])
            ->where('client_id', Auth::guard('client')->id())
            ->findOrFail($id);

        if ($negosiasi->status !== \App\Models\EventNegosiasi::DIJADWALKAN) {
            return back()->with('error', 'Tidak ada jadwal yang dapat diusulkan ulang saat ini.');
        }

        if (! $negosiasi->appointment) {
            return back()->with('error', 'Jadwal pertemuannya tidak ditemukan.');
        }

        $jam = substr($data['usulan_jam'], 0, 5);

        DB::transaction(function () use ($negosiasi, $data, $jam) {
            $negosiasi->appointment->update([
                'usulan_tgl'     => $data['usulan_tgl'],
                'usulan_jam'     => $jam,
                'usulan_catatan' => $data['usulan_catatan'] ?? null,
            ]);

            $negosiasi->update(['status' => \App\Models\EventNegosiasi::USULAN_KLIEN]);

            $jejak = 'Klien mengusulkan jadwal pembahasan '
                . \Illuminate\Support\Carbon::parse($data['usulan_tgl'])->translatedFormat('d M Y')
                . ' pukul ' . $jam . '.';

            $negosiasi->event?->catatJejak($jejak);
        });

        $this->kabariRole('EventMarketing',
            '🔄 Klien Mengusulkan Jadwal Lain — ' . ($negosiasi->event?->nama_event ?? '-'),
            'Klien mengusulkan pembahasan penawaran dipindahkan ke '
            . \Illuminate\Support\Carbon::parse($data['usulan_tgl'])->translatedFormat('l, d F Y')
            . ' pukul ' . $jam . ".\n\n"
            . (filled($data['usulan_catatan'] ?? null) ? 'Catatan klien: ' . $data['usulan_catatan'] . "\n\n" : '')
            . 'Silakan terima atau tawarkan waktu lain dari menu Negosiasi Klien.');

        return back()->with('success',
            'Usulan jadwal terkirim. Tim kami akan meninjau dan mengabari Anda.');
    }

    /** Kirim email pemberitahuan jelas ke PIC/EM saat klien merespon penawaran. */
    private function kabariPicPenawaran(Event $event, string $aksi, ?string $alasan = null): void
    {
        $email = $event->pic?->email_pegawai;
        if (! $email) {
            return;
        }

        $nama = $event->nama_event;

        if ($aksi === 'diterima') {
            $subjek = "✅ Penawaran DITERIMA klien — {$nama}";
            $isi = "Kabar baik! Klien telah MENERIMA penawaran untuk event \"{$nama}\".\n\n"
                 . "Event otomatis dipindahkan ke tahap DEAL. Silakan lanjutkan penerbitan invoice uang muka (DP) di modul Finance.\n\n"
                 . "— Sistem Laksamana Muda";
        } else {
            $subjek = "❌ Penawaran DITOLAK klien — {$nama}";
            $isi = "Klien MENOLAK penawaran untuk event \"{$nama}\"."
                 . ($alasan ? "\n\nAlasan dari klien: {$alasan}" : '')
                 . "\n\nEvent masih berada di tahap Negotiation. Silakan tindak lanjuti — negosiasi ulang, "
                 . "atau tandai \"Tidak jadi\" di papan Pipeline bila prospek tidak dilanjutkan.\n\n"
                 . "— Sistem Laksamana Muda";
        }

        try {
            $diterima = $aksi === 'Diterima';
            Mail::to($email)->send(new \App\Mail\PesanSistem(
                judul:    $diterima ? 'Penawaran Diterima Klien' : 'Penawaran Ditolak Klien',
                subjudul: $nama,
                ikon:     $diterima ? '✅' : '❌',
                nada:     $diterima ? 'hijau' : 'merah',
                paragraf: [$isi],
                detail:   array_filter([
                    'Acara'     => $nama,
                    'Keputusan' => $aksi,
                ]),
                catatan:  $alasan ?: null,
                subjek:   $subjek,
            ));
        } catch (\Exception $e) {
            \Log::warning('Email respon penawaran ke PIC gagal: ' . $e->getMessage());
        }
    }
}
