<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Event;
use Inertia\Inertia;
use App\Models\Notifikasi;
use App\Traits\ChecksPegawaiRole;

class DashboardController extends Controller
{
    use ChecksPegawaiRole;

    public function index()
    {
        $this->checkEventMarketing();

        $totalEvent  = Event::terkonfirmasi()->count();
        $eventActive = Event::whereIn('status_event', [Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN])->count();
        $eventDone   = Event::where('status_event', 'Done')->count();
        $recentEvents = Event::terkonfirmasi()->latest()->take(5)->get();

        // Appointment stats.
        //
        // Pembahasan penawaran dikecualikan di mana-mana, sama seperti halaman
        // Appointment: ia dikelola dari menu Negosiasi Klien dan tidak dapat
        // dikonfirmasi dari sini. Tanpa pengecualian ini angka di dashboard
        // tidak akan pernah cocok dengan daftar yang dibuka pengguna, dan
        // "menunggu konfirmasi" menampilkan pertemuan yang tak bisa ditindak.
        $bukanNegosiasi = fn ($q) => $q->whereDoesntHave('negosiasi');

        $aptTotal        = Appointment::tap($bukanNegosiasi)->count();
        $aptPending      = Appointment::tap($bukanNegosiasi)->where('status', 'Pending')->count();
        $aptDikonfirmasi = Appointment::tap($bukanNegosiasi)->where('status', 'Dikonfirmasi')->count();
        $aptReschedule   = Appointment::tap($bukanNegosiasi)->where('status', 'Reschedule')->count();
        $aptSelesai      = Appointment::tap($bukanNegosiasi)->where('status', 'Selesai')->count();
        $aptDibatalkan   = Appointment::tap($bukanNegosiasi)->where('status', 'Dibatalkan')->count();

        // Appointment bulan ini
        $aptBulanIni = Appointment::tap($bukanNegosiasi)
            ->whereMonth('tgl_request', now()->month)
            ->whereYear('tgl_request', now()->year)
            ->count();

        // Appointment yang masih menunggu konfirmasi
        $pendingAppointments = Appointment::with('client')
            ->tap($bukanNegosiasi)
            ->where('status', 'Pending')
            ->latest()
            ->take(10)
            ->get();

        // Ambil notifikasi EM dari DB (hanya tipe 'appointment', bukan notifikasi client)
        $notifikasi = Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->latest()->take(50)->get();
        $unread = Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->where('is_read', false)->count();

        return Inertia::render('EventMarketing/Dashboard', [
            'stats'               => compact('totalEvent', 'eventActive', 'eventDone'),
            'aptStats'            => compact('aptTotal', 'aptPending', 'aptDikonfirmasi', 'aptReschedule', 'aptSelesai', 'aptDibatalkan', 'aptBulanIni'),
            'recentEvents'        => $recentEvents,
            'pendingAppointments' => $pendingAppointments,
            'notifikasi'          => $notifikasi,
            'unread'              => $unread,
        ]);
    }
}
