<?php

namespace App\Traits;

use App\Models\Event;
use Illuminate\Http\Request;

/**
 * Bagian BACA buku transaksi per event: menyusun data untuk halaman index.
 *
 * Dipisah dari ManagesTransaksi supaya peran yang hanya boleh MELIHAT buku
 * transaksi tidak sekaligus mewarisi kemampuan menulisnya. Sebelumnya semua
 * peran memakai satu trait, sehingga Event Marketing ikut mendapat store,
 * update, dan destroy hanya karena butuh menampilkan tabelnya.
 *
 * Peran yang memang berwenang membukukan memakai ManagesTransaksi, yang sudah
 * mencakup trait ini.
 */
trait ShowsTransaksi
{
    /**
     * Susun data buku transaksi (events + filters + counts) untuk halaman index.
     * Dibagikan agar semua peran menampilkan tabel yang sama persis; masing-masing
     * controller tinggal me-render page-nya dengan hasil ini.
     */
    protected function transaksiIndexData(Request $request): array
    {
        $request->validate([
            'tipe'   => 'nullable|in:Internal,Eksternal',
            'bulan'  => 'nullable|integer|min:1|max:12',
            'tahun'  => 'nullable|integer|min:2000|max:2100',
            'status' => 'nullable|in:Lunas,Belum Lunas',
            'sort'   => 'nullable|in:tanggal,deal,nominal',
            'dir'    => 'nullable|in:asc,desc',
            'search' => 'nullable|string|max:255',
        ]);

        // Pisahkan transaksi event klien (Eksternal) dari event internal perusahaan.
        // Default ke Eksternal karena itu alur transaksi utama (deal → invoice).
        $tipe = $request->tipe === Event::TIPE_INTERNAL ? Event::TIPE_INTERNAL : Event::TIPE_EKSTERNAL;

        // Jumlah tiap tab (tidak terpengaruh filter lain) untuk badge.
        $counts = [
            Event::TIPE_EKSTERNAL => Event::untukFinance()->eksternal()->count(),
            Event::TIPE_INTERNAL  => Event::untukFinance()->internal()->count(),
        ];

        $query = Event::with(['client', 'pic', 'transaksis.pegawai', 'transaksiItems'])
            ->untukFinance()
            ->where('tipe_event', $tipe);

        if ($request->filled('bulan')) {
            $query->whereMonth('tgl_mulai_event', $request->bulan);
        }

        if ($request->filled('tahun')) {
            $query->whereYear('tgl_mulai_event', $request->tahun);
        }

        // Filter status lunas via subquery agar tetap bisa paginate. Sejalan dengan
        // Event::lunasKah(): acara tanpa nilai tagihan terhitung lunas.
        if ($request->status === 'Lunas') {
            $query->whereRaw('(deal_harga_event <= 0 OR (SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) >= deal_harga_event)');
        } elseif ($request->status === 'Belum Lunas') {
            $query->whereRaw('deal_harga_event > 0')
                  ->whereRaw('(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) < deal_harga_event');
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_event', 'like', '%' . $request->search . '%')
                  ->orWhereHas('client', fn($c) => $c->where('nama_client', 'like', '%' . $request->search . '%'));
            });
        }

        $sort = $request->sort ?? 'tanggal';
        $dir  = $request->dir  === 'asc' ? 'asc' : 'desc';

        match ($sort) {
            'deal'    => $query->orderBy('deal_harga_event', $dir),
            'nominal' => $query->orderByRaw(
                '(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) ' . $dir
            ),
            default   => $query->orderBy('tgl_mulai_event', $dir),
        };

        $events = $query->paginate(15)
            ->withQueryString()
            ->through(function ($event) {
                $totalDibayar     = $event->transaksis->sum('nominal');
                $totalPengeluaran = $event->transaksiItems->where('tipe', 'Pengeluaran')->sum('total');
                $totalPemasukan   = $event->transaksiItems->where('tipe', 'Pemasukan')->sum('total');
                $deal             = $event->deal_harga_event;
                $sisa             = $deal - $totalDibayar;
                // Laba bersih = pembayaran klien + pemasukan tambahan (sponsor, dll) - pengeluaran
                $labaBersih       = $totalDibayar + $totalPemasukan - $totalPengeluaran;
                $status           = Event::labelPembayaran((float) $deal, (float) $totalDibayar);

                return [
                    'id_event'          => $event->id_event,
                    'nama_event'        => $event->nama_event,
                    'tgl_event'         => $event->tgl_mulai_event,
                    'client'            => $event->client?->nama_client,
                    'perusahaan'        => $event->client?->perusahaan_client,
                    'jumlah_pax'        => $event->jumlah_pax,
                    'harga_per_pax'     => $event->harga_per_pax,
                    'deal'              => $deal,
                    'total_dibayar'     => $totalDibayar,
                    'sisa'              => $sisa,
                    'total_pengeluaran' => $totalPengeluaran,
                    'total_pemasukan'   => $totalPemasukan,
                    'laba_bersih'       => $labaBersih,
                    'status'            => $status,
                    'pembayarans'       => $event->transaksis->map(fn($t) => [
                        'id_transaksi'  => $t->id_transaksi,
                        'nominal'       => $t->nominal,
                        'tgl_bayar'     => $t->tgl_bayar,
                        'keterangan'    => $t->keterangan,
                        'bukti_file'    => $t->bukti_file,
                        'nama_pegawai'  => $t->pegawai?->nama_pegawai ?? '-',
                    ]),
                    'pengeluarans'      => $event->transaksiItems->map(fn($i) => [
                        'id_item'    => $i->id_item,
                        'tipe'       => $i->tipe,
                        'nama_item'  => $i->nama_item,
                        'qty'        => $i->qty,
                        'harga'      => $i->harga,
                        'total'      => $i->total,
                        'keterangan' => $i->keterangan,
                    ]),
                ];
            });

        return [
            'events'  => $events,
            'filters' => array_merge(
                $request->only(['bulan', 'tahun', 'status', 'sort', 'dir', 'search']),
                ['tipe' => $tipe],
            ),
            'counts'  => $counts,
        ];
    }
}
