<?php

namespace App\Traits;

use App\Models\Event;

/**
 * Papan Task Divisi: daftar event yang butuh dikerjakan divisi — internal yang
 * sedang direncanakan (Planning) dan event yang sudah berjalan (Upcoming).
 * Dipakai controller EM & Manajemen. Tiap kartu membawa ringkasan progres to-do
 * dan penanda tipe agar frontend bisa mengarahkan ke papan yang tepat.
 */
trait ManagesTaskDivisi
{
    protected function taskDivisiEvents()
    {
        return Event::taskDivisi()
            ->with(['client:id,nama_client', 'pic:id_pegawai,nama_pegawai'])
            ->withCount([
                'tugas as total_tugas',
                'tugas as done_tugas' => fn ($q) => $q->where('status_tugas', 'Done'),
            ])
            ->withAvg('tugas as avg_progress', 'progress')
            ->orderByRaw("FIELD(status_event, 'Upcoming', 'Planning')")
            ->orderBy('tgl_mulai_event')
            ->get()
            ->map(fn (Event $e) => [
                'id_event'        => $e->id_event,
                'nama_event'      => $e->nama_event,
                'kategori_event'  => $e->kategori_event,
                'tgl_mulai_event' => $e->tgl_mulai_event,
                'area_event'      => $e->area_event,
                'jumlah_pax'      => $e->jumlah_pax,
                'tipe_event'      => $e->tipe_event,
                'status_event'    => $e->status_event,
                'client'          => $e->client?->nama_client,
                'pic'             => $e->pic?->nama_pegawai,
                'total'           => (int) $e->total_tugas,
                'done'            => (int) $e->done_tugas,
                'progress'        => (int) round($e->avg_progress ?? 0),
            ]);
    }
}
