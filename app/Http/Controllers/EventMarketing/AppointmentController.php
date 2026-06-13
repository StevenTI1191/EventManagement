<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentDibatalkan;
use App\Mail\AppointmentDikonfirmasi;
use App\Mail\AppointmentReschedule;
use App\Models\Appointment;
use App\Models\BuktiPembayaran;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class AppointmentController extends Controller
{
    use ChecksPegawaiRole;
    public function index(Request $request)
    {
        $this->checkEventMarketing();

        $query = Appointment::with('client')->latest();

        if ($request->status && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }

        $appointments = $query->paginate(15)->withQueryString();

        $counts = [
            'pending'      => Appointment::where('status', 'Pending')->count(),
            'dikonfirmasi' => Appointment::where('status', 'Dikonfirmasi')->count(),
            'selesai'      => Appointment::where('status', 'Selesai')->count(),
            'dibatalkan'   => Appointment::where('status', 'Dibatalkan')->count(),
        ];

        return Inertia::render('EventMarketing/Appointment/Index', [
            'appointments' => $appointments,
            'counts'       => $counts,
            'filters'      => $request->only('status'),
        ]);
    }


    public function show($id)
    {
        $this->checkEventMarketing();

        $appointment = Appointment::with(['client', 'pegawai'])->findOrFail($id);

        return Inertia::render('EventMarketing/Appointment/Show', [
            'appointment' => $appointment,
        ]);
    }

    public function konfirmasi(Request $request, $id)
    {
        $this->checkEventMarketing();

        $request->validate([
            'tgl_konfirmasi' => 'required|date',
            'jam_konfirmasi' => 'nullable|string|max:8',
            'catatan_em'     => 'nullable|string|max:2000',
            'is_reschedule'  => 'boolean',
        ]);

        // State machine: hanya appointment dengan status Pending atau Reschedule yang bisa dikonfirmasi
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', ['Pending', 'Reschedule'])
            ->firstOrFail();
        $isReschedule = $request->is_reschedule;

        $appointment->update([
            'tgl_konfirmasi' => $request->tgl_konfirmasi,
            'jam_konfirmasi' => $request->jam_konfirmasi,
            'catatan_em'     => $request->catatan_em,
            'status'         => $isReschedule ? 'Reschedule' : 'Dikonfirmasi',
            'id_pegawai'     => Auth::guard('pegawai')->id(),
        ]);

        // Kirim email ke client
        $appointment->load('client');
        $emailClient = $appointment->client?->email_client;
        if ($emailClient) {
            try {
                $mailable = $isReschedule
                    ? new AppointmentReschedule($appointment)
                    : new AppointmentDikonfirmasi($appointment);
                Mail::to($emailClient)->send($mailable);
            } catch (\Exception $e) {
                \Log::warning('Email konfirmasi appointment gagal: ' . $e->getMessage());
            }
        }

        // Notifikasi in-app untuk client
        if ($appointment->client_id) {
            \App\Models\Notifikasi::create([
                'judul'        => $isReschedule ? '🔄 Jadwal Appointment Diubah' : '✅ Appointment Dikonfirmasi',
                'pesan'        => $isReschedule
                    ? "Jadwal meeting untuk \"{$appointment->jenis_event}\" telah diubah ke " . \Carbon\Carbon::parse($appointment->tgl_konfirmasi)->translatedFormat('d F Y') . " pukul {$appointment->jam_konfirmasi}."
                    : "Appointment Anda untuk \"{$appointment->jenis_event}\" telah dikonfirmasi pada " . \Carbon\Carbon::parse($appointment->tgl_konfirmasi)->translatedFormat('d F Y') . " pukul {$appointment->jam_konfirmasi}.",
                'tipe'         => 'appointment',
                'reference_id' => $appointment->id,
                'client_id'    => $appointment->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Appointment berhasil dikonfirmasi.');
    }

    public function selesai($id)
    {
        $this->checkEventMarketing();

        // Appointment yang sudah Dikonfirmasi atau Reschedule (keduanya = sudah ada jadwal) bisa diselesaikan
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
            ->firstOrFail();

        $appointment->update(['status' => 'Selesai']);
        return back()->with('success', 'Appointment ditandai selesai.');
    }

    public function batal(Request $request, $id)
    {
        $this->checkEventMarketing();

        $request->validate(['catatan_em' => 'required|string|min:5|max:2000']);

        // State machine: hanya appointment yang belum final yang bisa dibatalkan
        $appointment = Appointment::where('id', $id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->firstOrFail();

        $appointment->update([
            'status'     => 'Dibatalkan',
            'catatan_em' => $request->catatan_em,
            'id_pegawai' => Auth::guard('pegawai')->id(),
        ]);

        // Kirim email ke client
        $appointment->load('client');
        $emailClient = $appointment->client?->email_client;
        if ($emailClient) {
            try {
                Mail::to($emailClient)->send(new AppointmentDibatalkan($appointment));
            } catch (\Exception $e) {
                \Log::warning('Email pembatalan appointment gagal: ' . $e->getMessage());
            }
        }

        // Notifikasi in-app untuk client
        if ($appointment->client_id) {
            \App\Models\Notifikasi::create([
                'judul'        => '❌ Appointment Dibatalkan',
                'pesan'        => "Mohon maaf, appointment Anda untuk \"{$appointment->jenis_event}\" telah dibatalkan." . ($appointment->catatan_em ? " Alasan: {$appointment->catatan_em}" : ''),
                'tipe'         => 'appointment',
                'reference_id' => $appointment->id,
                'client_id'    => $appointment->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Appointment dibatalkan.');
    }
}
