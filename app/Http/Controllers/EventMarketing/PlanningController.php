<?php

namespace App\Http\Controllers\EventMarketing;

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
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Planning/Index', [
            'events' => $this->planningEvents(),
        ]);
    }

    public function create()
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Event/Create', [
            'clients'     => Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais'    => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
            'submitRoute' => 'em.planning.store',
            'indexRoute'  => 'em.planning.index',
            'planning'    => true,
        ]);
    }

    public function store(Request $request)
    {
        $this->checkEventMarketing();

        return $this->handlePlanningStore($request, 'em.planning.show');
    }

    public function show($id_event)
    {
        $this->checkEventMarketing();

        $event = Event::with(['client', 'pic'])
            ->where('status_event', 'Planning')
            ->findOrFail($id_event);

        return Inertia::render('EventMarketing/Planning/Board', [
            'event'   => $event,
            'tugas'   => $this->orderedTugas($id_event),
            'pegawai' => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get(),
            'mode'    => 'planning',
            'routes'  => [
                'store'    => 'em.todo.store',
                'update'   => 'em.todo.update',
                'destroy'  => 'em.todo.destroy',
                'finalize' => 'em.planning.finalize',
                'back'     => 'em.planning.index',
            ],
        ]);
    }

    public function finalize($id_event)
    {
        $this->checkEventMarketing();

        $event = Event::where('status_event', 'Planning')->findOrFail($id_event);
        $event->update(['status_event' => 'Upcoming']);

        return redirect()->route('em.event.index')
            ->with('success', 'Event dipindahkan ke daftar Events (Upcoming).');
    }
}
