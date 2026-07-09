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

        return Inertia::render('Manajemen/Planning/Create', [
            'categories'  => collect(\App\Support\PlanningTemplate::items())
                ->map(fn ($items, $name) => ['name' => $name, 'count' => count($items)])
                ->values(),
            'submitRoute' => 'manajemen.planning.store',
            'indexRoute'  => 'manajemen.planning.index',
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
                'store'        => 'manajemen.todo.store',
                'update'       => 'manajemen.todo.update',
                'destroy'      => 'manajemen.todo.destroy',
                'finalize'     => 'manajemen.planning.finalize',
                'eventEdit'    => 'manajemen.planning.edit',
                'eventDestroy' => 'manajemen.planning.destroy',
                'back'         => 'manajemen.planning.index',
            ],
        ]);
    }

    public function edit($id)
    {
        $this->checkManajemen();

        $event = Event::where('status_event', 'Planning')->findOrFail($id);

        return Inertia::render('Manajemen/Planning/Create', [
            'event'       => $event,
            'submitRoute' => 'manajemen.planning.update',
            'indexRoute'  => 'manajemen.planning.index',
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkManajemen();

        $event = Event::where('status_event', 'Planning')->findOrFail($id);
        $this->updatePlanningEvent($request, $event);

        return redirect()->route('manajemen.planning.show', $event->id_event)
            ->with('success', 'Event Planning berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $this->checkManajemen();

        Event::where('status_event', 'Planning')->findOrFail($id)->delete();

        return redirect()->route('manajemen.planning.index')
            ->with('success', 'Event Planning berhasil dihapus.');
    }

    public function finalize($id_event)
    {
        $this->checkManajemen();

        $event = Event::where('status_event', 'Planning')->findOrFail($id_event);
        $event->update(['status_event' => 'Upcoming']);

        return redirect()->route('manajemen.event.edit', $event->id_event)
            ->with('success', 'Event difinalisasi ke Upcoming. Lengkapi detail (Client, PIC, jam, area).');
    }
}
