<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Pegawai;
use App\Models\Tugas;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTugas;

class TugasController extends Controller
{
    use ChecksPegawaiRole, ManagesTugas;

    public function index($id_event)
    {
        $this->checkManajemen();

        $event = Event::with(['client', 'pic'])->findOrFail($id_event);

        return Inertia::render('Manajemen/Planning/Board', [
            'event'   => $event,
            'tugas'   => $this->orderedTugas($id_event),
            'pegawai' => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get(),
            'mode'    => 'event',
            'routes'  => [
                'store'   => 'manajemen.todo.store',
                'update'  => 'manajemen.todo.update',
                'destroy' => 'manajemen.todo.destroy',
                'back'    => 'manajemen.event.index',
            ],
        ]);
    }

    public function store(Request $request, $id_event)
    {
        $this->checkManajemen();
        $this->storeTugas($request, $id_event);
        return back();
    }

    public function update(Request $request, $id_tugas)
    {
        $this->checkManajemen();
        $this->updateTugas($request, $id_tugas);
        return back();
    }

    public function destroy($id_tugas)
    {
        $this->checkManajemen();
        Tugas::findOrFail($id_tugas)->delete();
        return back();
    }
}
