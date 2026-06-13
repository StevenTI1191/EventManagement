<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentDiterima;
use App\Models\Appointment;
use App\Models\BuktiPembayaran;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
    public function index()
    {
        $client = Auth::guard('client')->user();

        $appointments = Appointment::with('pegawai')
            ->where('client_id', $client->id)
            ->latest()
            ->take(50)
            ->get();

        // Event yang sudah deal dengan client ini
        $events = Event::where('id_client', $client->id)
            ->with(['pic', 'buktiPembayaran' => function($q) use ($client) {
                $q->where('client_id', $client->id);
            }])
            ->latest('tgl_mulai_event')
            ->take(50)
            ->get();

        return Inertia::render('Client/Dashboard', [
            'appointments'      => $appointments,
            'events'            => $events,
            'totalAppointments' => $appointments->count(),
            'totalEvents'       => $events->count(),
        ]);
    }

    /**
     * Slot meeting valid: 09:00–16:30, kelipatan 30 menit.
     * Meeting berdurasi 30 menit → slot mulai terakhir 16:30 (selesai 17:00).
     * Dipakai backend (validasi) & frontend (dropdown) agar konsisten.
     */
    public static function workingSlots(): array
    {
        $slots = [];
        for ($m = 9 * 60; $m <= 16 * 60 + 30; $m += 30) {
            $slots[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        }
        return $slots;
    }

    /** Status appointment yang dianggap "menempati" slot (untuk cek bentrok). */
    private const SLOT_BLOCKING_STATUS = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    /** Validasi: bukan Minggu, jam dalam slot kerja, dan tidak bentrok. */
    private function validateSlot(string $tgl, string $jam): void
    {
        if (\Illuminate\Support\Carbon::parse($tgl)->isSunday()) {
            throw ValidationException::withMessages([
                'tgl_request' => 'Hari Minggu libur. Pilih hari Senin–Sabtu.',
            ]);
        }

        if (! in_array($jam, self::workingSlots(), true)) {
            throw ValidationException::withMessages([
                'jam_request' => 'Pilih jam dalam jam kerja (09:00–16:30, kelipatan 30 menit).',
            ]);
        }

        $bentrok = Appointment::where('tgl_request', $tgl)
            ->where('jam_request', $jam)
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->exists();

        if ($bentrok) {
            throw ValidationException::withMessages([
                'jam_request' => 'Slot waktu ini sudah dipesan. Silakan pilih jam lain.',
            ]);
        }
    }

    /** JSON: daftar jam yang sudah dipesan pada satu tanggal (untuk disable di dropdown). */
    public function bookedSlots(Request $request)
    {
        $request->validate(['tgl' => 'required|date']);

        $booked = Appointment::where('tgl_request', $request->tgl)
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->whereNotNull('jam_request')
            ->pluck('jam_request')
            ->map(fn ($t) => substr($t, 0, 5))
            ->values();

        return response()->json(['booked' => $booked]);
    }

    public function create()
    {
        $client = Auth::guard('client')->user();

        // Wajib lengkapi profil (perusahaan + no HP) dulu — terutama akun Google
        // yang otomatis tanpa data ini. Arahkan ke profil sebelum buat appointment.
        if (empty($client->perusahaan_client) || empty($client->no_telp_client)) {
            return redirect()->route('client.profile')
                ->with('warning', 'Lengkapi nama perusahaan dan nomor HP terlebih dahulu sebelum membuat appointment.');
        }

        $hasActive = Appointment::where('client_id', $client->id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->exists();

        return Inertia::render('Client/Appointment/Create', [
            'has_active_appointment' => $hasActive,
            'missing_phone'          => empty($client->no_telp_client),
            'missing_company'        => empty($client->perusahaan_client),
            'slots'                  => self::workingSlots(),
        ]);
    }

    public function store(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 5 appointment baru per jam per client
        $rateLimitKey = 'appointment-store:' . $client->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 5)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            throw ValidationException::withMessages([
                'jenis_event' => "Terlalu banyak permintaan. Coba lagi dalam {$seconds} detik.",
            ]);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        // Blokir jika nama perusahaan / no HP belum diisi
        if (empty($client->perusahaan_client) || empty($client->no_telp_client)) {
            return back()->withErrors([
                'jenis_event' => 'Lengkapi nama perusahaan dan nomor HP di profil terlebih dahulu.',
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

        // Validasi jam kerja (Senin–Sabtu, slot 30 menit 09:00–16:30) + cek bentrok
        $this->validateSlot($request->tgl_request, $request->jam_request);
        $appointment = Appointment::create([
            ...$request->only([
                'jenis_event', 'deskripsi_event', 'jumlah_tamu',
                'estimasi_budget', 'tgl_request', 'jam_request',
            ]),
            'client_id' => $client->id,
            'status'    => 'Pending',
        ]);

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
        ]);

        return back()->with('success', 'Appointment berhasil dibatalkan.');
    }

    public function uploadBukti(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 10 upload per jam per client (mencegah disk flooding)
        $rateLimitKey = 'bukti-upload:' . $client->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return back()->withErrors([
                'file_bukti' => "Terlalu banyak upload. Coba lagi dalam {$seconds} detik.",
            ]);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        $request->validate([
            // Pastikan event milik client yang login — cegah IDOR
            'id_event'    => ['required', Rule::exists('events', 'id_event')->where('id_client', $client->id)],
            'file_bukti'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'nominal'     => 'nullable|numeric|min:0|max:9999999999999',
            'keterangan'  => 'nullable|string|max:500',
        ]);

        $file     = $request->file('file_bukti');
        $filename = $file->hashName();
        Storage::disk('local')->putFileAs('bukti-pembayaran', $file, $filename);
        $path = 'bukti-pembayaran/' . $filename;

        BuktiPembayaran::create([
            'id_event'   => $request->id_event,
            'client_id'  => $client->id,
            'file_bukti' => $path,
            'nominal'    => $request->nominal,
            'keterangan' => $request->keterangan,
            'status'     => 'Menunggu',
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

        return back()->with('success', 'Bukti pembayaran berhasil diupload.');
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
}
