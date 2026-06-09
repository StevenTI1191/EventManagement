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

    public function create()
    {
        $client = Auth::guard('client')->user();

        $hasActive = Appointment::where('client_id', $client->id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->exists();

        return Inertia::render('Client/Appointment/Create', [
            'has_active_appointment' => $hasActive,
            'missing_phone'          => empty($client->no_telp_client),
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

        // Blokir jika no HP belum diisi
        if (empty($client->no_telp_client)) {
            return back()->withErrors([
                'jenis_event' => 'Nomor HP belum diisi. Lengkapi profil Anda terlebih dahulu.',
            ]);
        }

        $request->validate([
            'jenis_event'     => 'required|string|max:255',
            'deskripsi_event' => 'nullable|string|max:5000',
            'jumlah_tamu'     => 'nullable|integer|min:1|max:100000',
            'estimasi_budget' => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_request'     => ['required', 'date', 'after:today'],
            'jam_request'     => 'nullable|string|max:8',
        ], [
            'tgl_request.after' => 'Tanggal meeting harus setelah hari ini.',
        ]);
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
        Storage::disk('local')->putFileAs('private/bukti-pembayaran', $file, $filename);
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
