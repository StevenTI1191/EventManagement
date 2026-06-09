<?php
namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Tugas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class TugasController extends Controller
{
    use ChecksPegawaiRole;
    public function index($id_event)
    {
        $this->checkEventMarketing();

        $event = Event::with(['client', 'pic'])->findOrFail($id_event);
        $tugas = Tugas::where('id_event', $id_event)->latest()->take(500)->get();

        return Inertia::render('EventMarketing/TodoList', [
            'event' => $event,
            'tugas' => $tugas,
        ]);
    }

    public function store(Request $request, $id_event)
    {
        $this->checkEventMarketing();

        $request->validate([
            'nama_tugas'      => 'required|string|max:255',
            'deskripsi_tugas' => 'nullable|string|max:5000',
            'catatan_tugas'   => 'nullable|string|max:5000',
            'deadline_tugas'  => 'nullable|date',
        ]);

        Tugas::create([
            'id_event'        => $id_event,
            'nama_tugas'      => $request->nama_tugas,
            'deskripsi_tugas' => $request->deskripsi_tugas,
            'catatan_tugas'   => $request->catatan_tugas,
            'deadline_tugas'  => $request->deadline_tugas,
            'status_tugas'    => 'Ongoing',
        ]);

        return back();
    }

    public function update(Request $request, $id_tugas)
    {
        $this->checkEventMarketing();

        $request->validate([
            'nama_tugas'      => 'nullable|string|max:255',
            'deskripsi_tugas' => 'nullable|string|max:5000',
            'catatan_tugas'   => 'nullable|string|max:5000',
            'deadline_tugas'  => 'nullable|date',
            'status_tugas'    => 'nullable|in:Ongoing,Done',
        ]);

        $tugas = Tugas::findOrFail($id_tugas);

        $tugas->update([
            'nama_tugas'      => $request->nama_tugas      ?? $tugas->nama_tugas,
            'deskripsi_tugas' => $request->deskripsi_tugas ?? $tugas->deskripsi_tugas,
            'catatan_tugas'   => $request->catatan_tugas   ?? $tugas->catatan_tugas,
            'deadline_tugas'  => $request->deadline_tugas  ?? $tugas->deadline_tugas,
            'status_tugas'    => $request->status_tugas    ?? $tugas->status_tugas,
        ]);

        return back();
    }

    public function destroy($id_tugas)
    {
        $this->checkEventMarketing();

        Tugas::findOrFail($id_tugas)->delete();
        return back();
    }
}
