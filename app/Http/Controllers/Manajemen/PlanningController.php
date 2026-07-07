<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPlanning;
use App\Traits\ManagesTugas;

class PlanningController extends Controller
{
    use ChecksPegawaiRole, ManagesPlanning, ManagesTugas;

    public function index()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Planning/Index', [
            'events' => $this->planningEvents(),
        ]);
    }

    public function create()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Event/Create', [
            'clients'     => Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais'    => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
            'submitRoute' => 'manajemen.planning.store',
            'indexRoute'  => 'manajemen.planning.index',
            'planning'    => true,
        ]);
    }

    public function store(Request $request)
    {
        $this->checkManajemen();

        return $this->handlePlanningStore($request, 'manajemen.planning.show');
    }

    public function show($id_event)
    {
        $this->checkManajemen();

        $event = Event::with(['client', 'pic'])
            ->where('status_event', 'Planning')
            ->findOrFail($id_event);

        return Inertia::render('Manajemen/Planning/Board', [
            'event'   => $event,
            'tugas'   => $this->orderedTugas($id_event),
            'pegawai' => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get(),
            'mode'    => 'planning',
            'routes'  => [
                'store'    => 'manajemen.todo.store',
                'update'   => 'manajemen.todo.update',
                'destroy'  => 'manajemen.todo.destroy',
                'finalize' => 'manajemen.planning.finalize',
                'back'     => 'manajemen.planning.index',
            ],
        ]);
    }

    public function finalize($id_event)
    {
        $this->checkManajemen();

        $event = Event::where('status_event', 'Planning')->findOrFail($id_event);
        $event->update(['status_event' => 'Upcoming']);

        return redirect()->route('manajemen.event.index')
            ->with('success', 'Event dipindahkan ke daftar Events (Upcoming).');
    }
}
