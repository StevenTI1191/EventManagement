<?php

namespace App\Traits;

use App\Models\Tugas;
use Illuminate\Http\Request;

/**
 * Logika bersama pengelolaan item To-Do / Planning (tabel tugas),
 * dipakai oleh TugasController & PlanningController di role EM maupun Manajemen.
 */
trait ManagesTugas
{
    /** Ambil tugas satu event, sudah di-load PIC & terurut kategori→urutan. */
    protected function orderedTugas($id_event)
    {
        return Tugas::with('pegawai:id_pegawai,nama_pegawai')
            ->where('id_event', $id_event)
            ->orderBy('kategori')
            ->orderBy('urutan')
            ->orderBy('id_tugas')
            ->take(1000)
            ->get();
    }

    /** Buat satu item tugas (dipakai tombol "tambah item" di board). */
    protected function storeTugas(Request $request, $id_event): void
    {
        $request->validate([
            'nama_tugas'     => 'required|string|max:255',
            'kategori'       => 'nullable|string|max:255',
            'timeline'       => 'nullable|string|max:255',
            'catatan_tugas'  => 'nullable|string|max:5000',
            'deadline_tugas' => 'nullable|date',
            'id_pegawai'     => 'nullable|exists:pegawais,id_pegawai',
            'progress'       => 'nullable|integer|min:0|max:100',
        ]);

        $kategori = $request->kategori ?: null;

        $urutan = (int) Tugas::where('id_event', $id_event)
            ->where('kategori', $kategori)
            ->max('urutan');

        $progress = (int) ($request->progress ?? 0);

        Tugas::create([
            'id_event'       => $id_event,
            'nama_tugas'     => $request->nama_tugas,
            'kategori'       => $kategori,
            'timeline'       => $request->timeline ?: null,
            'id_pegawai'     => $request->id_pegawai ?: null,
            'catatan_tugas'  => $request->catatan_tugas,
            'deadline_tugas' => $request->deadline_tugas ?: null,
            'status_tugas'   => $progress >= 100 ? 'Done' : 'Ongoing',
            'progress'       => $progress,
            'urutan'         => $urutan + 1,
        ]);
    }

    /** Update sebagian field item (inline edit board). Sinkronkan progress ↔ status. */
    protected function updateTugas(Request $request, $id_tugas): void
    {
        $request->validate([
            'nama_tugas'     => 'nullable|string|max:255',
            'kategori'       => 'nullable|string|max:255',
            'timeline'       => 'nullable|string|max:255',
            'catatan_tugas'  => 'nullable|string|max:5000',
            'deadline_tugas' => 'nullable|date',
            'id_pegawai'     => 'nullable|exists:pegawais,id_pegawai',
            'status_tugas'   => 'nullable|in:Ongoing,Done',
            'progress'       => 'nullable|integer|min:0|max:100',
        ]);

        $tugas = Tugas::findOrFail($id_tugas);

        foreach (['nama_tugas', 'kategori', 'timeline', 'catatan_tugas'] as $f) {
            if ($request->has($f)) {
                $tugas->$f = $request->$f;
            }
        }
        if ($request->has('deadline_tugas')) {
            $tugas->deadline_tugas = $request->deadline_tugas ?: null;
        }
        if ($request->has('id_pegawai')) {
            $tugas->id_pegawai = $request->id_pegawai ?: null;
        }

        // progress & status saling menyesuaikan
        if ($request->has('progress')) {
            $p = max(0, min(100, (int) $request->progress));
            $tugas->progress     = $p;
            $tugas->status_tugas = $p >= 100 ? 'Done' : 'Ongoing';
        } elseif ($request->has('status_tugas')) {
            $s = $request->status_tugas;
            $tugas->status_tugas = $s;
            $tugas->progress     = $s === 'Done' ? 100 : ($tugas->progress >= 100 ? 0 : $tugas->progress);
        }

        $tugas->save();
    }
}
