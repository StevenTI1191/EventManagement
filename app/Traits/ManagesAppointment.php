<?php

namespace App\Traits;

use App\Mail\AppointmentDibatalkan;
use App\Mail\AppointmentDikonfirmasi;
use App\Mail\AppointmentReschedule;
use App\Models\Appointment;
use App\Models\Notifikasi;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Logika bersama menu Appointment (EM & Manajemen).
 *
 * Sebelumnya hanya EM yang punya: Manajemen cuma bisa melihat daftar, tanpa
 * halaman detail, tanpa konfirmasi, tanpa catatan hasil meeting. Dipindah ke
 * trait supaya keduanya benar-benar sama dan tidak melenceng lagi seperti yang
 * sudah terjadi pada halaman Transaksi.
 */
trait ManagesAppointment
{
    /** Status yang boleh dikonfirmasi / dijadwal ulang. */
    private const BISA_DIKONFIRMASI = ['Pending', 'Reschedule'];

    /** Status yang berarti jadwalnya sudah ada. */
    private const SUDAH_DIJADWALKAN = ['Dikonfirmasi', 'Reschedule'];

    /**
     * Daftar appointment. Isinya gabungan dari kedua versi lama: pencarian dan
     * hitungan Reschedule dulu hanya ada di Manajemen, sedangkan EM tidak
     * punya — menyamakan keduanya tidak boleh berarti salah satu kehilangan
     * yang sudah dimilikinya.
     */
    protected function daftarAppointment(Request $request, string $komponen, array $routes): Response
    {
        $request->validate([
            'status' => 'nullable|string|max:30',
            'search' => 'nullable|string|max:255',
        ]);

        // Pembahasan penawaran TIDAK ditampilkan di sini. Ia punya alur sendiri
        // — tawar-menawar jadwal dua arah yang berujung pada penawaran revisi —
        // dan dikelola sepenuhnya dari halaman Negosiasi Klien. Mencampurnya ke
        // daftar ini membuat tim melihat dua tombol konfirmasi untuk satu
        // pertemuan yang sama, dengan aturan yang berbeda pula.
        $query = Appointment::with(['client', 'pegawai'])
            ->whereDoesntHave('negosiasi')
            ->latest();

        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->whereHas('client', fn ($q) => $q
                ->where('nama_client', 'like', '%' . $request->search . '%')
                ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%'));
        }

        return Inertia::render($komponen, [
            'appointments' => $query->paginate(15)->withQueryString(),
            // Hitungannya mengikuti daftar di atas — pembahasan negosiasi tidak
            // ikut, supaya angkanya cocok dengan yang benar-benar tampil.
            'counts'       => collect(['pending' => 'Pending', 'dikonfirmasi' => 'Dikonfirmasi',
                    'reschedule' => 'Reschedule', 'selesai' => 'Selesai', 'dibatalkan' => 'Dibatalkan'])
                ->map(fn ($status) => Appointment::where('status', $status)
                    ->whereDoesntHave('negosiasi')->count())
                ->all(),
            'filters'      => $request->only(['status', 'search']),
            'routes'       => $routes,
        ]);
    }

    protected function detailAppointment($id, string $komponen, array $routes): Response
    {
        return Inertia::render($komponen, [
            'appointment' => Appointment::with([
                'client', 'pegawai', 'event:id_event,nama_event,status_event',
            ])->findOrFail($id),
            'routes'      => $routes,
        ]);
    }

    protected function konfirmasiAppointment(Request $request, $id)
    {
        $request->validate([
            'tgl_konfirmasi' => 'required|date',
            // Jam wajib: jadwal meeting tanpa jam tidak bermakna, emailnya jadi
            // "pukul " kosong, dan kunci slot tidak bisa dibentuk darinya.
            'jam_konfirmasi' => ['required', 'string', 'max:8', \App\Models\Event::ATURAN_JAM],
            'catatan_em'     => 'nullable|string|max:2000',
            'is_reschedule'  => 'boolean',
        ], [
            'jam_konfirmasi.required' => 'Tentukan jam meeting.',
        ]);

        // Hanya yang belum dikonfirmasi — mencegah jadwal yang sudah disepakati
        // ditimpa diam-diam dari peran lain.
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', self::BISA_DIKONFIRMASI)
            ->firstOrFail();

        $reschedule = $request->boolean('is_reschedule');

        // Slot tujuan diperiksa dengan aturan yang sama seperti pemesanan klien.
        // Ini juga yang menjaga usulan jadwal klien: usulan tidak mengunci slot
        // apa pun saat diajukan (ia baru sebuah permintaan), jadi kelayakannya
        // harus dinilai ulang di sini — saat disetujui — bukan saat diusulkan.
        \App\Support\SlotMeeting::periksa(
            \Illuminate\Support\Carbon::parse($request->tgl_konfirmasi)->toDateString(),
            $request->jam_konfirmasi,
            $appointment->id,
            'tgl_konfirmasi',
            'jam_konfirmasi',
        );

        try {
            $appointment->update([
                'tgl_konfirmasi' => $request->tgl_konfirmasi,
                'jam_konfirmasi' => $request->jam_konfirmasi,
                'catatan_em'     => $request->catatan_em,
                'status'         => $reschedule ? 'Reschedule' : 'Dikonfirmasi',
                'id_pegawai'     => Auth::guard('pegawai')->id(),
                // Jadwal sudah diputuskan tim → usulan klien (bila ada) tak berlaku lagi.
                'usulan_tgl'     => null,
                'usulan_jam'     => null,
                'usulan_catatan' => null,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Backstop unique index slot_key, bila dua konfirmasi menyasar slot
            // yang sama nyaris bersamaan dan lolos pemeriksaan di atas.
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'jam_konfirmasi' => 'Slot ini baru saja terpakai. Silakan pilih jam lain.',
                ]);
            }
            throw $e;
        }

        // Pertemuan yang lahir dari negosiasi penawaran boleh ditawar balik:
        // klien mengusulkan hari lain lewat appointment ini, lalu tim
        // menyetujuinya di sini. Negosiasinya dianggap tuntas begitu jadwalnya
        // benar-benar disepakati, dari jalur mana pun kesepakatan itu datang —
        // bukan hanya ketika klien menekan "Terima Jadwal Ini".
        if (! $reschedule) {
            // UsulanKlien ikut: klien menawar hari lain, lalu tim menyetujuinya
            // dari halaman Appointment alih-alih lewat terimaUsulan(). Tanpa
            // status itu, negosiasinya tertinggal di antrean "usulan klien"
            // selamanya padahal jadwalnya sudah disepakati.
            \App\Models\EventNegosiasi::where('id_appointment', $appointment->id)
                ->whereIn('status', [
                    \App\Models\EventNegosiasi::DIJADWALKAN,
                    \App\Models\EventNegosiasi::USULAN_KLIEN,
                ])
                ->update(['status' => \App\Models\EventNegosiasi::MENUNGGU_MEETING]);
        }

        $appointment->load('client');
        $tanggal = Carbon::parse($appointment->tgl_konfirmasi)->translatedFormat('d F Y');

        $this->kabariKlien(
            $appointment,
            $reschedule ? new AppointmentReschedule($appointment) : new AppointmentDikonfirmasi($appointment),
            $reschedule ? '🔄 Jadwal Appointment Diubah' : '✅ Appointment Dikonfirmasi',
            $reschedule
                ? "Jadwal meeting untuk \"{$appointment->jenis_event}\" telah diubah ke {$tanggal} pukul {$appointment->jam_konfirmasi}."
                : "Appointment Anda untuk \"{$appointment->jenis_event}\" telah dikonfirmasi pada {$tanggal} pukul {$appointment->jam_konfirmasi}.",
            'konfirmasi appointment',
        );

        return back()->with('success', 'Appointment berhasil dikonfirmasi.');
    }

    /**
     * Tolak aksi yang akan memutus alur pembahasan penawaran.
     *
     * Pertemuan pembahasan memang tidak tampil pada daftar Appointment, tetapi
     * seluruh aksi di sini dijangkau lewat id sehingga penyaringan pada daftar
     * saja tidak menjaga apa pun. Siklus hidupnya dimiliki halaman Negosiasi
     * Klien: hasilnya dicatat di sana, dan pencatatan itulah yang melepaskan
     * penawaran yang sedang tertahan bagi klien.
     *
     * Yang paling merugikan adalah penghapusan. Kolom penghubungnya berperilaku
     * SET NULL, sehingga pembahasannya kehilangan jadwal — meetingSudahLewat()
     * selamanya bernilai salah, hasilnya tidak akan pernah dapat dicatat, dan
     * barisnya lenyap dari lencana maupun pengingat sementara penawaran klien
     * tetap tertahan.
     *
     * Konfirmasi dan pencatatan hasil TIDAK dijaga di sini: keduanya memang
     * bagian dari alur pembahasan itu sendiri.
     */
    private function tolakBilaPembahasan(Appointment $appointment, string $aksi): void
    {
        $negosiasi = $appointment->negosiasi;

        if ($negosiasi && in_array($negosiasi->status, \App\Models\EventNegosiasi::BERJALAN, true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'appointment' => "Pertemuan ini adalah pembahasan penawaran, jadi tidak dapat {$aksi} "
                    . 'dari halaman Appointment. Tuntaskan atau tutup pembahasannya dari menu '
                    . 'Negosiasi Klien — di sanalah hasilnya dicatat dan penawaran klien dilepaskan.',
            ]);
        }
    }

    protected function selesaikanAppointment($id)
    {
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', self::SUDAH_DIJADWALKAN)
            ->firstOrFail();

        // Pembahasan penawaran dinyatakan selesai lewat pencatatan hasilnya,
        // bukan dengan menandai pertemuannya selesai dari sini.
        $this->tolakBilaPembahasan($appointment, 'ditandai selesai');

        $appointment->update(['status' => 'Selesai']);

        return back()->with('success', 'Appointment ditandai selesai.');
    }

    /**
     * Catatan hasil meeting. Bisa diisi saat jadwalnya sudah ada maupun setelah
     * selesai — isinya nanti terbawa saat event dibuat dari appointment ini.
     */
    protected function catatanMeetingAppointment(Request $request, $id)
    {
        $data = $request->validate(['catatan_meeting' => 'nullable|string|max:5000']);

        $appointment = Appointment::whereIn('status', [...self::SUDAH_DIJADWALKAN, 'Selesai'])
            ->findOrFail($id);

        $sebelumnyaKosong = blank($appointment->catatan_meeting);

        $appointment->update(['catatan_meeting' => $data['catatan_meeting']]);

        // Catatan hasil pertemuan kini juga terbaca klien pada riwayat
        // appointment-nya. Klien dikabari hanya saat catatannya PERTAMA KALI
        // diisi — penyuntingan berikutnya tidak memberitahu lagi, supaya
        // memperbaiki salah ketik tidak berubah jadi banjir notifikasi.
        if ($sebelumnyaKosong && filled($data['catatan_meeting']) && $appointment->client_id) {
            Notifikasi::create([
                'judul'        => '📝 Hasil Pertemuan Dicatat',
                'pesan'        => 'Tim kami mencatat hasil pertemuan "' . $appointment->jenis_event
                    . '". Silakan tinjau pada riwayat appointment Anda.',
                'tipe'         => 'appointment',
                'reference_id' => $appointment->id,
                'client_id'    => $appointment->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Catatan meeting tersimpan.');
    }

    /**
     * Tolak usulan jadwal dari klien. Usulan dihapus (jadwal semula tetap
     * berlaku) dan klien diberi tahu bahwa usulannya belum dapat dipenuhi.
     */
    protected function tolakUsulanAppointment(Request $request, $id)
    {
        $data = $request->validate(['alasan' => 'nullable|string|max:500']);

        // Hanya appointment yang masih berjalan. Tanpa penjagaan status, usulan
        // yang tertinggal pada appointment yang sudah dibatalkan/selesai masih
        // bisa "ditolak", dan klien menerima email "jadwal meeting tetap ..."
        // untuk meeting yang sudah tidak ada.
        $appointment = Appointment::whereNotNull('usulan_tgl')
            ->whereIn('status', Appointment::STATUS_AKTIF)
            ->findOrFail($id);
        $appointment->load('client');

        $appointment->update([
            'usulan_tgl'     => null,
            'usulan_jam'     => null,
            'usulan_catatan' => null,
        ]);

        $jadwal = $appointment->tgl_konfirmasi
            ? Carbon::parse($appointment->tgl_konfirmasi)->translatedFormat('d F Y')
                . ($appointment->jam_konfirmasi ? ' pukul ' . $appointment->jam_konfirmasi : '')
            : null;

        $pesan = "Mohon maaf, usulan jadwal Anda untuk \"{$appointment->jenis_event}\" belum dapat kami penuhi."
            . ($jadwal ? " Jadwal meeting tetap {$jadwal}." : '')
            . (filled($data['alasan'] ?? null) ? ' Catatan: ' . trim($data['alasan']) : '');

        if ($appointment->client_id) {
            Notifikasi::create([
                'judul'        => '🔄 Usulan Jadwal Belum Dapat Dipenuhi',
                'pesan'        => $pesan,
                'tipe'         => 'appointment',
                'reference_id' => $appointment->id,
                'client_id'    => $appointment->client_id,
                'is_read'      => false,
            ]);
        }

        if ($email = $appointment->client?->email_client) {
            try {
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    'Usulan Jadwal Belum Dapat Dipenuhi',
                    subjudul: $appointment->jenis_event,
                    ikon:     '🔄',
                    nada:     'jingga',
                    sapaan:   'Halo, ' . ($appointment->client?->nama_client ?? 'Klien') . '!',
                    paragraf: [$pesan],
                    detail:   array_filter([
                        'Jenis pertemuan' => $appointment->jenis_event,
                    ]),
                    subjek:   'Usulan jadwal meeting',
                ));
            } catch (\Exception $e) {
                \Log::warning('Email tolak usulan gagal: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Usulan jadwal klien ditolak. Klien telah diberi tahu.');
    }

    /**
     * Hapus appointment secara PERMANEN. Dijaga konfirmasi ketat: pengguna harus
     * mengetik kata "HAPUS" (validasi juga di server, bukan hanya di tombol).
     * Hanya mengubah data appointment — tidak menyentuh event yang mungkin sudah
     * lahir darinya.
     */
    protected function hapusAppointment(Request $request, $id): void
    {
        $request->validate([
            'konfirmasi' => ['required', 'in:HAPUS'],
        ], [
            'konfirmasi.required' => 'Ketik HAPUS untuk mengonfirmasi.',
            'konfirmasi.in'       => 'Konfirmasi tidak cocok. Ketik HAPUS (huruf besar) persis.',
        ]);

        $appointment = Appointment::findOrFail($id);

        $this->tolakBilaPembahasan($appointment, 'dihapus');

        $appointment->delete();
    }

    protected function batalkanAppointment(Request $request, $id)
    {
        $request->validate(['catatan_em' => 'required|string|min:5|max:2000']);

        $appointment = Appointment::where('id', $id)
            ->whereIn('status', ['Pending', ...self::SUDAH_DIJADWALKAN])
            ->firstOrFail();

        // Membatalkan pertemuannya dari sini meninggalkan pembahasannya tetap
        // berjalan tanpa jadwal yang bisa dihadiri. Penutupannya dilakukan dari
        // halaman Negosiasi Klien, yang sekaligus melepas slotnya.
        $this->tolakBilaPembahasan($appointment, 'dibatalkan');

        $appointment->update([
            'status'     => 'Dibatalkan',
            'catatan_em' => $request->catatan_em,
            'id_pegawai' => Auth::guard('pegawai')->id(),
            // Usulan yang menggantung ikut dibersihkan — appointment ini sudah
            // tidak punya jadwal untuk diubah.
            'usulan_tgl'     => null,
            'usulan_jam'     => null,
            'usulan_catatan' => null,
        ]);

        $appointment->load('client');

        $this->kabariKlien(
            $appointment,
            new AppointmentDibatalkan($appointment),
            '❌ Appointment Dibatalkan',
            "Mohon maaf, appointment Anda untuk \"{$appointment->jenis_event}\" telah dibatalkan."
                . ($appointment->catatan_em ? " Alasan: {$appointment->catatan_em}" : ''),
            'pembatalan appointment',
        );

        return back()->with('success', 'Appointment dibatalkan.');
    }

    /**
     * Kabari klien lewat email dan notifikasi dalam aplikasi.
     * Email yang gagal dicatat saja — pembatalan atau konfirmasinya sendiri
     * sudah tersimpan, jadi tidak boleh ikut digagalkan.
     */
    private function kabariKlien(Appointment $appointment, $mailable, string $judul, string $pesan, string $konteks): void
    {
        if ($email = $appointment->client?->email_client) {
            try {
                Mail::to($email)->send($mailable);
            } catch (\Exception $e) {
                \Log::warning("Email {$konteks} gagal: " . $e->getMessage());
            }
        }

        if ($appointment->client_id) {
            Notifikasi::create([
                'judul'        => $judul,
                'pesan'        => $pesan,
                'tipe'         => 'appointment',
                'reference_id' => $appointment->id,
                'client_id'    => $appointment->client_id,
                'is_read'      => false,
            ]);
        }
    }
}
