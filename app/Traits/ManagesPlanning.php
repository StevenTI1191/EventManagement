<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Tugas;
use App\Support\PlanningTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Logika bersama menu "Planning Event" (EM & Manajemen):
 * daftar event Planning, pembuatan event ringkas + generate to-do template
 * berdasarkan kategori yang dipilih, dan finalisasi ke Upcoming.
 */
trait ManagesPlanning
{
    /** Daftar event berstatus Planning + ringkasan progres to-do. */
    protected function planningEvents()
    {
        return Event::with(['client:id,nama_client', 'pic:id_pegawai,nama_pegawai'])
            ->withCount([
                'tugas as total_tugas',
                'tugas as done_tugas' => fn ($q) => $q->where('status_tugas', 'Done'),
            ])
            ->withAvg('tugas as avg_progress', 'progress')
            ->where('status_event', 'Planning')
            ->latest()
            ->get()
            ->map(fn ($e) => [
                'id_event'        => $e->id_event,
                'nama_event'      => $e->nama_event,
                'kategori_event'  => $e->kategori_event,
                'tgl_mulai_event' => $e->tgl_mulai_event,
                'client'          => $e->client?->nama_client,
                'pic'             => $e->pic?->nama_pegawai,
                'total'           => (int) $e->total_tugas,
                'done'            => (int) $e->done_tugas,
                'progress'        => (int) round($e->avg_progress ?? 0),
            ]);
    }

    /** Buat item to-do template untuk kategori terpilih (null = semua kategori). */
    protected function generateTemplate(Event $event, ?array $categories = null): void
    {
        $now  = now();
        $rows = [];
        foreach (PlanningTemplate::items() as $kategori => $items) {
            if ($categories !== null && ! in_array($kategori, $categories, true)) {
                continue;
            }
            $urutan = 0;
            foreach ($items as [$nama, $timeline]) {
                $rows[] = [
                    'id_event'       => $event->id_event,
                    'nama_tugas'     => $nama,
                    'kategori'       => $kategori,
                    'timeline'       => $timeline,
                    'deadline_tugas' => $this->deadlineFromTimeline($event->tgl_mulai_event, $timeline),
                    'status_tugas'   => 'Ongoing',
                    'progress'       => 0,
                    'urutan'         => $urutan++,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ];
            }
        }
        if ($rows) {
            Tugas::insert($rows);
        }
    }

    /**
     * Form Planning ringkas: hanya Nama, Deskripsi, Kategori Event, Tanggal + pilihan kategori to-do.
     * Client/PIC/jam/area dilengkapi nanti saat finalisasi (edit event). PIC default = pembuat.
     */
    protected function handlePlanningStore(Request $request, string $showRoute): RedirectResponse
    {
        $request->validate([
            'nama_event'      => 'required|string|max:255',
            'deskripsi_event' => 'nullable|string|max:5000',
            'kategori_event'  => 'nullable|string|max:255',
            'tgl_mulai_event' => 'required|date',
            'target_pax'      => 'nullable|integer|min:0|max:100000',
            'target_omset'    => 'nullable|numeric|min:0|max:9999999999999',
            'categories'      => 'nullable|array',
            'categories.*'    => 'string|max:255',
        ]);

        $event = Event::create([
            'nama_event'       => $request->nama_event,
            'deskripsi_event'  => $request->deskripsi_event,
            'kategori_event'   => $request->kategori_event,
            'tgl_mulai_event'  => $request->tgl_mulai_event,
            'target_pax'       => $request->target_pax,
            'target_omset'     => $request->target_omset,
            'id_pegawai'       => Auth::guard('pegawai')->id(),
            'status_event'     => 'Planning',
            'is_public'        => false,
            'jumlah_pax'       => 0,
            'deal_harga_event' => 0,
        ]);

        $cats = $request->input('categories');
        $this->generateTemplate($event, is_array($cats) ? $cats : null);

        return redirect()->route($showRoute, $event->id_event);
    }

    /** Hitung deadline dari timeline H-x relatif ke tanggal acara. */
    protected function deadlineFromTimeline($eventStart, ?string $timeline): ?string
    {
        if (! $eventStart || ! $timeline) {
            return null;
        }
        $start = \Illuminate\Support\Carbon::parse($eventStart);
        if (preg_match('/H\s*-\s*(\d+)/i', $timeline, $m)) {
            return $start->copy()->subDays((int) $m[1])->toDateString();
        }
        // Timeline "H" atau "H (Hari - H)" tanpa angka dianggap hari-H
        if (preg_match('/\bH\b/i', $timeline) && ! preg_match('/\d/', $timeline)) {
            return $start->toDateString();
        }
        return null;
    }

    /** Update field ringkas event Planning (dari halaman edit). */
    protected function updatePlanningEvent(Request $request, Event $event): void
    {
        $request->validate([
            'nama_event'      => 'required|string|max:255',
            'deskripsi_event' => 'nullable|string|max:5000',
            'kategori_event'  => 'nullable|string|max:255',
            'tgl_mulai_event' => 'required|date',
            'target_pax'      => 'nullable|integer|min:0|max:100000',
            'target_omset'    => 'nullable|numeric|min:0|max:9999999999999',
        ]);

        $event->update($request->only([
            'nama_event', 'deskripsi_event', 'kategori_event',
            'tgl_mulai_event', 'target_pax', 'target_omset',
        ]));
    }
}
