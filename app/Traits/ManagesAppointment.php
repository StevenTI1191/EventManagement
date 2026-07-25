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

        $query = Appointment::with(['client', 'pegawai'])->latest();

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
            'counts'       => [
                'pending'      => Appointment::where('status', 'Pending')->count(),
                'dikonfirmasi' => Appointment::where('status', 'Dikonfirmasi')->count(),
                'reschedule'   => Appointment::where('status', 'Reschedule')->count(),
                'selesai'      => Appointment::where('status', 'Selesai')->count(),
                'dibatalkan'   => Appointment::where('status', 'Dibatalkan')->count(),
            ],
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
            'jam_konfirmasi' => 'nullable|string|max:8',
            'catatan_em'     => 'nullable|string|max:2000',
            'is_reschedule'  => 'boolean',
        ]);

        // Hanya yang belum dikonfirmasi — mencegah jadwal yang sudah disepakati
        // ditimpa diam-diam dari peran lain.
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', self::BISA_DIKONFIRMASI)
            ->firstOrFail();

        $reschedule = $request->boolean('is_reschedule');

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

    protected function selesaikanAppointment($id)
    {
        Appointment::where('id', $id)
            ->whereIn('status', self::SUDAH_DIJADWALKAN)
            ->firstOrFail()
            ->update(['status' => 'Selesai']);

        return back()->with('success', 'Appointment ditandai selesai.');
    }

    /**
     * Catatan hasil meeting. Bisa diisi saat jadwalnya sudah ada maupun setelah
     * selesai — isinya nanti terbawa saat event dibuat dari appointment ini.
     */
    protected function catatanMeetingAppointment(Request $request, $id)
    {
        $data = $request->validate(['catatan_meeting' => 'nullable|string|max:5000']);

        Appointment::whereIn('status', [...self::SUDAH_DIJADWALKAN, 'Selesai'])
            ->findOrFail($id)
            ->update(['catatan_meeting' => $data['catatan_meeting']]);

        return back()->with('success', 'Catatan meeting tersimpan.');
    }

    /**
     * Tolak usulan jadwal dari klien. Usulan dihapus (jadwal semula tetap
     * berlaku) dan klien diberi tahu bahwa usulannya belum dapat dipenuhi.
     */
    protected function tolakUsulanAppointment(Request $request, $id)
    {
        $data = $request->validate(['alasan' => 'nullable|string|max:500']);

        $appointment = Appointment::whereNotNull('usulan_tgl')->findOrFail($id);
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
                Mail::raw($pesan, fn ($m) => $m->to($email)->subject('Usulan Jadwal Meeting'));
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

        Appointment::findOrFail($id)->delete();
    }

    protected function batalkanAppointment(Request $request, $id)
    {
        $request->validate(['catatan_em' => 'required|string|min:5|max:2000']);

        $appointment = Appointment::where('id', $id)
            ->whereIn('status', ['Pending', ...self::SUDAH_DIJADWALKAN])
            ->firstOrFail();

        $appointment->update([
            'status'     => 'Dibatalkan',
            'catatan_em' => $request->catatan_em,
            'id_pegawai' => Auth::guard('pegawai')->id(),
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
