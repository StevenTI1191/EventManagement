<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AppointmentController extends Controller
{
    use ChecksPegawaiRole;

    public function index(Request $request)
    {
        $this->checkManajemen();

        $query = Appointment::with(['client', 'pegawai']);

        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->whereHas('client', fn($q) =>
                $q->where('nama_client', 'like', '%' . $request->search . '%')
                  ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%')
            );
        }

        $appointments = $query->latest()->paginate(15)->withQueryString();

        $counts = [
            'pending'      => Appointment::where('status', 'Pending')->count(),
            'dikonfirmasi' => Appointment::where('status', 'Dikonfirmasi')->count(),
            'reschedule'   => Appointment::where('status', 'Reschedule')->count(),
            'selesai'      => Appointment::where('status', 'Selesai')->count(),
            'dibatalkan'   => Appointment::where('status', 'Dibatalkan')->count(),
        ];

        return Inertia::render('Manajemen/Appointment/Index', [
            'appointments' => $appointments,
            'counts'       => $counts,
            'filters'      => $request->only(['status', 'search']),
        ]);
    }
}
