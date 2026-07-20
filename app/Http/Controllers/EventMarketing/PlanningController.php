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

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        $jenis = $this->jenisPlanning($request);

        return Inertia::render('EventMarketing/Planning/Index', [
            'events' => $this->planningEvents($jenis),
            'jenis'  => $jenis,
            'jumlah' => $this->jumlahPlanning(),
        ]);
    }

    public function create(Request $request)
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Planning/Create', [
            'categories'  => collect(\App\Support\PlanningTemplate::items())
                ->map(fn ($items, $name) => ['name' => $name, 'count' => count($items)])
                ->values(),
            'clients'     => $this->daftarClientPlanning(),
            // Jenis mengikuti tab yang sedang dibuka di daftar rencana.
            'jenisAwal'   => $this->jenisPlanning($request),
            'submitRoute' => 'em.planning.store',
            'indexRoute'  => 'em.planning.index',
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
                'store'        => 'em.todo.store',
                'update'       => 'em.todo.update',
                'destroy'      => 'em.todo.destroy',
                'finalize'     => 'em.planning.finalize',
                'eventEdit'    => 'em.planning.edit',
                'eventDestroy' => 'em.planning.destroy',
                'back'         => 'em.planning.index',
            ],
        ]);
    }

    public function edit($id)
    {
        $this->checkEventMarketing();

        $event = Event::where('status_event', 'Planning')->findOrFail($id);

        return Inertia::render('EventMarketing/Planning/Create', [
            'event'       => $event,
            'clients'     => $this->daftarClientPlanning(),
            'submitRoute' => 'em.planning.update',
            'indexRoute'  => 'em.planning.index',
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkEventMarketing();

        $event = Event::where('status_event', 'Planning')->findOrFail($id);
        $this->updatePlanningEvent($request, $event);

        return redirect()->route('em.planning.show', $event->id_event)
            ->with('success', 'Event Planning berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $this->checkEventMarketing();

        Event::where('status_event', 'Planning')->findOrFail($id)->delete();

        return redirect()->route('em.planning.index')
            ->with('success', 'Event Planning berhasil dihapus.');
    }

    public function finalize($id_event)
    {
        $this->checkEventMarketing();

        $event = Event::where('status_event', 'Planning')->findOrFail($id_event);

        return $this->finalisasiPlanning($event, 'em.event.show', 'em.pipeline.index');
    }
}
