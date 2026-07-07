<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Tugas;
use App\Support\PlanningTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Logika bersama menu "Planning Event" (EM & Manajemen):
 * daftar event Planning, pembuatan event + generate to-do template, finalisasi.
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
                'area_event'      => $e->area_event,
                'client'          => $e->client?->nama_client,
                'pic'             => $e->pic?->nama_pegawai,
                'total'           => (int) $e->total_tugas,
                'done'            => (int) $e->done_tugas,
                'progress'        => (int) round($e->avg_progress ?? 0),
            ]);
    }

    /** Buat semua item to-do template (per kategori) untuk sebuah event. */
    protected function generateTemplate(Event $event): void
    {
        $now  = now();
        $rows = [];
        foreach (PlanningTemplate::items() as $kategori => $items) {
            $urutan = 0;
            foreach ($items as [$nama, $timeline]) {
                $rows[] = [
                    'id_event'     => $event->id_event,
                    'nama_tugas'   => $nama,
                    'kategori'     => $kategori,
                    'timeline'     => $timeline,
                    'status_tugas' => 'Ongoing',
                    'progress'     => 0,
                    'urutan'       => $urutan++,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ];
            }
        }
        if ($rows) {
            Tugas::insert($rows);
        }
    }

    /** Validasi + buat event (status Planning) + generate template, lalu redirect ke board. */
    protected function handlePlanningStore(Request $request, string $showRoute): RedirectResponse
    {
        $request->validate([
            'nama_event'        => 'required|string|max:255',
            'id_client'         => 'required|exists:clients,id',
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'required|string|max:8',
            'jam_selesai'       => 'required|string|max:8',
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            'is_public'         => 'nullable|boolean',
            'poster_event'      => 'nullable|file|image|max:10240',
            'kontrak_file'      => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        $bentrok = Event::checkBentrok(
            $request->tgl_mulai_event,
            $request->jam_mulai,
            $request->jam_selesai,
            $request->area_event
        );

        if ($bentrok) {
            return back()->withErrors([
                'bentrok' => "Jadwal bentrok dengan event \"{$bentrok->nama_event}\"
                            ({$bentrok->jam_mulai} - {$bentrok->jam_selesai})
                            di area {$bentrok->area_event}
                            pada tanggal {$bentrok->tgl_mulai_event}."
            ])->withInput();
        }

        $data = $request->only([
            'nama_event', 'id_client', 'id_pegawai', 'kategori_event', 'deskripsi_event',
            'tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai',
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event',
        ]);

        $data['status_event'] = 'Planning';
        $data['is_public']    = $request->boolean('is_public');
        if (empty($data['deal_harga_event'])) {
            $data['deal_harga_event'] = 0;
        }

        if ($request->hasFile('poster_event') && $request->file('poster_event')->isValid()) {
            $file = $request->file('poster_event');
            $filename = $file->hashName();
            $destinationPath = public_path('posters');
            if (! file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }
            $file->move($destinationPath, $filename);
            $data['poster_event'] = 'posters/' . $filename;
        }

        if ($request->hasFile('kontrak_file') && $request->file('kontrak_file')->isValid()) {
            $file = $request->file('kontrak_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('kontrak', $file, $filename);
            $data['kontrak_file'] = $filename;
        }

        $event = Event::create($data);
        $this->generateTemplate($event);

        return redirect()->route($showRoute, $event->id_event);
    }
}
