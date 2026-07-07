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

        $totalEvent  = Event::where('status_event', '!=', 'Planning')->count();
        $eventActive = Event::where('status_event', 'Upcoming')->count();
        $eventDone   = Event::where('status_event', 'Done')->count();
        $recentEvents = Event::where('status_event', '!=', 'Planning')->latest()->take(5)->get();

        // Appointment stats
        $aptTotal        = Appointment::count();
        $aptPending      = Appointment::where('status', 'Pending')->count();
        $aptDikonfirmasi = Appointment::where('status', 'Dikonfirmasi')->count();
        $aptReschedule   = Appointment::where('status', 'Reschedule')->count();
        $aptSelesai      = Appointment::where('status', 'Selesai')->count();
        $aptDibatalkan   = Appointment::where('status', 'Dibatalkan')->count();

        // Appointment bulan ini
        $aptBulanIni = Appointment::whereMonth('tgl_request', now()->month)
            ->whereYear('tgl_request', now()->year)
            ->count();

        // Appointment yang masih menunggu konfirmasi
        $pendingAppointments = Appointment::with('client')
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
