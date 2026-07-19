<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Riwayat event — acara yang sudah pernah dijalankan, beserta perbandingan
 * target dengan hasil nyatanya.
 *
 * Target pax & omset dipasang saat perencanaan lalu tidak pernah terlihat lagi
 * setelah event berjalan: daftar Event menampilkan status dan jadwal, sedangkan
 * Evaluasi hanya menjumlahkan target per pegawai. Halaman ini yang menyimpan
 * jejaknya per event, supaya perencanaan berikutnya punya rujukan.
 */
trait ShowsRiwayatEvent
{
    /** Status yang dianggap "pernah dijalankan". */
    private const STATUS_RIWAYAT = [Event::STATUS_DONE, Event::STATUS_PENYELESAIAN];

    protected function halamanRiwayatEvent(string $komponen, Request $request, array $routes): Response
    {
        $request->validate([
            'tahun'      => 'nullable|integer|min:2000|max:2100',
            'kategori'   => 'nullable|string|max:255',
            'id_pegawai' => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        // Filter yang sama dipakai dua kali: sekali untuk daftar, sekali untuk
        // ringkasan. Ringkasan harus mencakup seluruh hasil filter, bukan hanya
        // halaman yang sedang dibuka.
        $saring = function ($q) use ($request) {
            $q->whereIn('status_event', self::STATUS_RIWAYAT);

            if ($request->tahun) {
                $q->whereYear('tgl_mulai_event', $request->tahun);
            }
            if ($request->kategori) {
                $q->where('kategori_event', $request->kategori);
            }
            if ($request->id_pegawai) {
                $q->where('id_pegawai', $request->id_pegawai);
            }
            if ($request->search) {
                $q->where('nama_event', 'like', '%' . $request->search . '%');
            }

            return $q;
        };

        $events = $saring(Event::query())
            ->with(['client:id,nama_client,perusahaan_client', 'pic:id_pegawai,nama_pegawai'])
            ->withSum('transaksis as terbayar', 'nominal')
            ->orderByDesc('tgl_mulai_event')
            ->paginate(12)
            ->withQueryString();

        $ringkas = $saring(Event::query())
            ->selectRaw('COUNT(*) as jumlah')
            ->selectRaw('COALESCE(SUM(target_omset), 0) as target_omset')
            ->selectRaw('COALESCE(SUM(deal_harga_event), 0) as realisasi_omset')
            ->selectRaw('COALESCE(SUM(target_pax), 0) as target_pax')
            ->selectRaw('COALESCE(SUM(jumlah_pax), 0) as realisasi_pax')
            ->first();

        return Inertia::render($komponen, [
            'events'  => $events,
            'ringkas' => [
                'jumlah'          => (int) $ringkas->jumlah,
                'target_omset'    => (float) $ringkas->target_omset,
                'realisasi_omset' => (float) $ringkas->realisasi_omset,
                'target_pax'      => (int) $ringkas->target_pax,
                'realisasi_pax'   => (int) $ringkas->realisasi_pax,
            ],
            'filters'   => $request->only(['tahun', 'kategori', 'id_pegawai', 'search']),
            'tahunAda'  => Event::whereIn('status_event', self::STATUS_RIWAYAT)
                ->selectRaw('DISTINCT YEAR(tgl_mulai_event) as tahun')
                ->orderByDesc('tahun')
                ->pluck('tahun')
                ->filter()
                ->values(),
            'kategoris' => Event::whereIn('status_event', self::STATUS_RIWAYAT)
                ->distinct()->pluck('kategori_event')->filter()->values(),
            'pegawais'  => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')
                ->orderBy('nama_pegawai')->get(),
            'routes'    => $routes,
        ]);
    }
}
