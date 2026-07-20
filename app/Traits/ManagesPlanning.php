<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Tugas;
use App\Support\PlanningTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Logika bersama menu "Planning Event" (EM & Manajemen):
 * daftar event Planning, pembuatan event ringkas + generate to-do template
 * berdasarkan kategori yang dipilih, dan finalisasi ke Upcoming.
 */
trait ManagesPlanning
{
    /**
     * Daftar event berstatus Planning + ringkasan progres to-do.
     *
     * Disaring per jenis rencana (lihat Event::PLANNING_JENIS): acara internal
     * milik LMB sendiri, atau konsep yang disiapkan untuk diajukan ke klien.
     * Tanpa argumen = semua rencana.
     */
    protected function planningEvents(?string $jenis = null)
    {
        $query = Event::with(['client:id,nama_client', 'pic:id_pegawai,nama_pegawai'])
            ->withCount([
                'tugas as total_tugas',
                'tugas as done_tugas' => fn ($q) => $q->where('status_tugas', 'Done'),
            ])
            ->withAvg('tugas as avg_progress', 'progress')
            ->where('status_event', Event::STATUS_PLANNING);

        // Yang membedakan kedua jenis hanya ada tidaknya klien sasaran.
        if ($jenis === Event::PLANNING_KLIEN) {
            $query->whereNotNull('id_client');
        } elseif ($jenis === Event::PLANNING_INTERNAL) {
            $query->whereNull('id_client');
        }

        return $query->latest()
            ->get()
            ->map(fn ($e) => [
                'id_event'        => $e->id_event,
                'nama_event'      => $e->nama_event,
                'kategori_event'  => $e->kategori_event,
                'tgl_mulai_event' => $e->tgl_mulai_event,
                'tgl_selesai_event' => $e->tgl_selesai_event,
                'jam_mulai'       => $e->jam_mulai,
                'jam_selesai'     => $e->jam_selesai,
                'area_event'      => $e->area_event,
                'client'          => $e->client?->nama_client,
                'pic'             => $e->pic?->nama_pegawai,
                'total'           => (int) $e->total_tugas,
                'done'            => (int) $e->done_tugas,
                'progress'        => (int) round($e->avg_progress ?? 0),
                'jenis'           => $e->id_client ? Event::PLANNING_KLIEN : Event::PLANNING_INTERNAL,
            ]);
    }

    /** Jenis rencana yang valid dari query string, default internal. */
    protected function jenisPlanning(Request $request): string
    {
        return in_array($request->jenis, Event::PLANNING_JENIS, true)
            ? $request->jenis
            : Event::PLANNING_INTERNAL;
    }

    /** Jumlah rencana per jenis — untuk badge di tab. */
    protected function jumlahPlanning(): array
    {
        $planning = fn () => Event::where('status_event', Event::STATUS_PLANNING);

        return [
            Event::PLANNING_INTERNAL => $planning()->whereNull('id_client')->count(),
            Event::PLANNING_KLIEN    => $planning()->whereNotNull('id_client')->count(),
        ];
    }

    /**
     * Daftar klien untuk dropdown "klien sasaran" di Planning Event.
     * Semua klien ditampilkan beserta sumbernya (Mandiri = daftar sendiri,
     * Internal = di-input/di-approach tim) agar jelas mana calon yang digarap tim.
     */
    protected function daftarClientPlanning()
    {
        return \App\Models\Client::select('id', 'nama_client', 'perusahaan_client', 'sumber')
            ->orderBy('nama_client')
            ->get();
    }

    /** Buat item to-do template untuk kategori terpilih (null = semua kategori). */
    protected function generateTemplate(Event $event, ?array $categories = null): void
    {
        // Logika sesungguhnya ada di TugasTemplate agar bisa dipakai bersama
        // dengan pembuatan otomatis saat event klien masuk Upcoming.
        \App\Support\TugasTemplate::generate($event, $categories);
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
            'multi_hari'      => 'nullable|boolean',
        ] + $this->aturanJadwalPlanning() + $this->aturanJenisPlanning($request));

        $event = Event::create([
            'nama_event'       => $request->nama_event,
            'deskripsi_event'  => $request->deskripsi_event,
            'kategori_event'   => $request->kategori_event,
            'tgl_mulai_event'  => $request->tgl_mulai_event,
            'target_pax'       => $request->target_pax,
            'target_omset'     => $request->target_omset,
            'id_client'        => $this->clientSasaran($request),
            'id_pegawai'       => Auth::guard('pegawai')->id(),
            'status_event'     => 'Planning',
            // Semua rencana lahir sebagai internal. Yang diajukan ke klien baru
            // berubah jadi eksternal saat masuk pipeline (lihat finalisasiPlanning).
            'tipe_event'       => Event::TIPE_INTERNAL,
            // Penanda asal — hanya acara dari sini yang boleh punya target.
            'dari_planning'    => true,
            'is_public'        => false,
            'jumlah_pax'       => 0,
            'deal_harga_event' => 0,
        ] + $this->isianJadwalPlanning($request));

        $cats = $request->input('categories');
        $this->generateTemplate($event, is_array($cats) ? $cats : null);

        return redirect()->route($showRoute, $event->id_event);
    }

    /** Hitung deadline dari timeline H-x relatif ke tanggal acara. */
    protected function deadlineFromTimeline($eventStart, ?string $timeline): ?string
    {
        return \App\Support\TugasTemplate::deadlineDariTimeline($eventStart, $timeline);
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
            'multi_hari'      => 'nullable|boolean',
        ] + $this->aturanJadwalPlanning() + $this->aturanJenisPlanning($request));

        $event->update($request->only([
            'nama_event', 'deskripsi_event', 'kategori_event',
            'tgl_mulai_event', 'target_pax', 'target_omset',
        ]) + ['id_client' => $this->clientSasaran($request)]
          + $this->isianJadwalPlanning($request));
    }

    /**
     * Jadwal rencana. Semuanya opsional karena namanya juga masih rencana —
     * tapi disediakan sejak awal supaya acara yang jadwalnya sudah pasti bisa
     * langsung difinalisasi tanpa harus dilengkapi lagi di halaman detail.
     */
    protected function aturanJadwalPlanning(): array
    {
        return [
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'nullable|string|max:8',
            'jam_selesai'       => 'nullable|string|max:8',
            'area_event'        => 'nullable|string|max:255',
        ];
    }

    /** Kolom jadwal yang ikut disimpan dari form Planning. */
    protected function isianJadwalPlanning(Request $request): array
    {
        return [
            // Acara sehari: tanggal selesai dikosongkan, bukan disamakan —
            // agar tampilannya tidak menulis rentang untuk acara satu hari.
            'tgl_selesai_event' => $request->boolean('multi_hari') ? $request->tgl_selesai_event : null,
            'jam_mulai'         => $request->jam_mulai ?: null,
            'jam_selesai'       => $request->jam_selesai ?: null,
            'area_event'        => $request->area_event ?: null,
        ];
    }

    /**
     * Aturan validasi jenis rencana. Klien sasaran wajib bila rencananya
     * diajukan ke klien — tanpa itu rencana tersebut tidak akan pernah
     * sampai ke pipeline.
     */
    protected function aturanJenisPlanning(Request $request): array
    {
        return [
            'jenis'     => ['nullable', Rule::in(Event::PLANNING_JENIS)],
            'id_client' => [
                Rule::requiredIf(fn () => $request->input('jenis') === Event::PLANNING_KLIEN),
                'nullable',
                'exists:clients,id',
            ],
        ];
    }

    /**
     * Klien sasaran sesuai jenis rencana.
     *
     * Rencana internal selalu dikosongkan, supaya sisa pilihan dropdown tidak
     * ikut tersimpan dan diam-diam menyeret rencana itu ke pipeline.
     *
     * Bila "jenis" tidak dikirim sama sekali — mis. halaman lama yang masih
     * terbuka tepat setelah deploy — nilainya dibiarkan apa adanya. Menganggap
     * itu sebagai rencana internal akan menghapus klien sasaran tanpa diminta,
     * dan rencananya lenyap dari pipeline tanpa jejak.
     */
    protected function clientSasaran(Request $request): ?int
    {
        $jenis = $request->input('jenis');

        if ($jenis === Event::PLANNING_INTERNAL) {
            return null;
        }

        return $request->id_client ?: null;
    }

    /**
     * Akhir tahap Planning — bercabang sesuai jenis rencana.
     *
     * Rencana internal langsung jadi Upcoming karena acaranya dijalankan
     * sendiri. Rencana yang menyasar klien TIDAK boleh lompat ke Upcoming:
     * ia masuk pipeline sebagai Lead lebih dulu, supaya penawaran, deal, dan
     * penagihan tidak terlewat.
     */
    protected function finalisasiPlanning(Event $event, string $detailRoute, string $pipelineRoute): RedirectResponse
    {
        if ($event->id_client) {
            $event->update([
                'status_event' => Event::STATUS_LEAD,
                'tipe_event'   => Event::TIPE_EKSTERNAL,
            ]);

            return redirect()->route($pipelineRoute)->with(
                'success',
                "\"{$event->nama_event}\" diajukan ke klien dan masuk pipeline di kolom Lead. "
                . 'Lanjutkan dengan mengirim penawaran.'
            );
        }

        // Acara internal melompat langsung ke Upcoming tanpa melewati pipeline,
        // jadi pemeriksaan bentrok yang biasanya terjadi saat menyimpan event
        // tidak pernah berjalan padanya. Diperiksa di sini selagi jadwalnya
        // sudah utuh, supaya tidak ada dua acara berimpit di area yang sama.
        if (filled($event->jam_mulai) && filled($event->jam_selesai) && filled($event->area_event)) {
            $bentrok = Event::checkBentrok(
                $event->tgl_mulai_event,
                $event->jam_mulai,
                $event->jam_selesai,
                $event->area_event,
                $event->id_event,
                $event->tgl_selesai_event,
            );

            if ($bentrok) {
                return back()->with(
                    'error',
                    "Jadwal bentrok dengan \"{$bentrok->nama_event}\" di area {$bentrok->area_event} "
                    . "pada {$bentrok->tgl_mulai_event}. Ubah jadwal atau areanya dulu sebelum difinalisasi."
                );
            }
        }

        $event->update(['status_event' => Event::STATUS_UPCOMING]);

        // Diarahkan ke halaman detail, bukan form Event lama: form itu meminta
        // klien, sedangkan acara internal memang tidak punya klien.
        return redirect()->route($detailRoute, $event->id_event)->with(
            'success',
            'Event internal difinalisasi ke Upcoming. Lengkapi jam, area, dan PIC-nya di bawah.'
        );
    }
}
