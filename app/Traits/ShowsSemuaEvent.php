<?php

namespace App\Traits;

use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Seluruh siklus acara dalam satu tabel — dari Lead sampai Done.
 *
 * Dua daftar yang sudah ada masing-masing hanya memperlihatkan sepotong:
 * "Sedang Berjalan" menyaring acara yang sudah pasti terjadi, "Riwayat" hanya
 * yang sudah dijalankan. Prospek yang masih ditawar tidak tampak di keduanya,
 * padahal di situlah nilai deal dan target omset perlu dibandingkan untuk
 * melihat gambaran menyeluruh.
 */
trait ShowsSemuaEvent
{
    protected function halamanSemuaEvent(string $komponen, Request $request, array $routes): Response
    {
        $request->validate([
            'status'     => 'nullable|string|max:30',
            'tipe'       => 'nullable|in:Internal,Eksternal',
            'tahun'      => 'nullable|integer|min:2000|max:2100',
            'kategori'   => 'nullable|string|max:255',
            'id_pegawai' => 'nullable|integer|min:1',
            'id_client'  => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        // Acara yang dibatalkan sengaja tidak ikut kecuali diminta lewat
        // saringan status — daftar ini untuk melihat siklus yang berjalan,
        // bukan arsip pembatalan.
        $saring = function ($q) use ($request) {
            if ($request->filled('status')) {
                $q->where('status_event', $request->status);
            } else {
                $q->whereIn('status_event', Event::PIPELINE_KOLOM);
            }

            // Pisahkan acara milik LM sendiri dari pesanan klien.
            if ($request->tipe) {
                $q->where('tipe_event', $request->tipe);
            }
            if ($request->tahun) {
                $q->whereYear('tgl_mulai_event', $request->tahun);
            }
            if ($request->kategori) {
                $q->where('kategori_event', $request->kategori);
            }
            if ($request->id_pegawai) {
                $q->where('id_pegawai', $request->id_pegawai);
            }
            if ($request->id_client) {
                $q->where('id_client', $request->id_client);
            }
            if ($request->search) {
                $q->where('nama_event', 'like', '%' . $request->search . '%');
            }

            return $q;
        };

        $events = $saring(Event::query())
            ->with(['client:id,nama_client,perusahaan_client', 'pic:id_pegawai,nama_pegawai'])
            ->withSum('transaksis as terbayar', 'nominal')
            ->withCount([
                'tugas as total_tugas',
                'tugas as done_tugas' => fn ($q) => $q->where('status_tugas', 'Done'),
            ])
            ->orderByRaw('COALESCE(tgl_mulai_event, updated_at) DESC')
            ->paginate(20)
            ->withQueryString();

        // Ringkasan mengikuti seluruh hasil saringan, bukan halaman yang
        // sedang dibuka.
        $ringkas = $saring(Event::query())
            ->selectRaw('COUNT(*) as jumlah')
            ->selectRaw('COALESCE(SUM(deal_harga_event), 0) as nilai_deal')
            ->selectRaw('COALESCE(SUM(target_omset), 0) as target_omset')
            ->first();

        // Jumlah per tahap, supaya sebaran acara terlihat tanpa berpindah saringan.
        $perStatus = Event::whereIn('status_event', Event::PIPELINE_KOLOM)
            ->selectRaw('status_event, COUNT(*) as jumlah')
            ->groupBy('status_event')
            ->pluck('jumlah', 'status_event');

        return Inertia::render($komponen, [
            'events'  => $events,
            'ringkas' => [
                'jumlah'       => (int) $ringkas->jumlah,
                'nilai_deal'   => (float) $ringkas->nilai_deal,
                'target_omset' => (float) $ringkas->target_omset,
            ],
            'perStatus' => $perStatus,
            'tahapan'   => Event::PIPELINE_KOLOM,
            'filters'   => $request->only(['status', 'tipe', 'tahun', 'kategori', 'id_pegawai', 'id_client', 'search']),
            'jumlahTipe' => [
                'Internal'  => Event::whereIn('status_event', Event::PIPELINE_KOLOM)->internal()->count(),
                'Eksternal' => Event::whereIn('status_event', Event::PIPELINE_KOLOM)->eksternal()->count(),
            ],
            'tahunAda'  => Event::whereIn('status_event', Event::PIPELINE_KOLOM)
                ->selectRaw('DISTINCT YEAR(tgl_mulai_event) as tahun')
                ->orderByDesc('tahun')->pluck('tahun')->filter()->values(),
            'kategoris' => Event::whereIn('status_event', Event::PIPELINE_KOLOM)
                ->distinct()->pluck('kategori_event')->filter()->values(),
            'pegawais'  => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')
                ->orderBy('nama_pegawai')->get(),
            'clients'   => Client::select('id', 'nama_client', 'perusahaan_client')
                ->orderBy('nama_client')->get(),
            'routes'    => $routes,
        ]);
    }
}
