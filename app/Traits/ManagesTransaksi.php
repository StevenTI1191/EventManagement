<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use App\Support\PelunasanInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Operasi tulis buku transaksi per event: pencatatan pembayaran (uang masuk yang
 * dikaitkan ke pelunasan invoice) dan item pemasukan/pengeluaran lain. Dipakai
 * bersama oleh Finance dan Event Marketing agar keduanya bisa membukukan
 * transaksi dengan aturan yang persis sama.
 *
 * Controller pemakai wajib menyediakan checkTransaksiAkses() untuk menegakkan
 * peran yang boleh membukukan (mis. Finance atau Event Marketing).
 */
trait ManagesTransaksi
{
    /** Tegakkan peran yang boleh membukukan transaksi. */
    abstract protected function checkTransaksiAkses(): void;

    /**
     * Susun data buku transaksi (events + filters + counts) untuk halaman index.
     * Dibagikan agar Finance & Event Marketing menampilkan tabel yang sama persis;
     * masing-masing controller tinggal me-render page-nya dengan hasil ini.
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

    /** Catat pembayaran (uang masuk) untuk sebuah event. */
    public function store(Request $request)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'id_event'   => 'required|exists:events,id_event',
            'nominal'    => 'required|numeric|min:1|max:9999999999999',
            'tgl_bayar'  => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'bukti_file' => 'nullable|file|image|max:2048',
        ]);

        $data = $request->only(['id_event', 'nominal', 'tgl_bayar', 'keterangan']);
        $data['id_pegawai'] = Auth::guard('pegawai')->user()->id_pegawai;

        if ($request->hasFile('bukti_file') && $request->file('bukti_file')->isValid()) {
            $file     = $request->file('bukti_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('bukti-transaksi', $file, $filename);
            $data['bukti_file'] = $filename;
        }

        $transaksi = Transaksi::create($data);

        // Pembayaran yang dicatat langsung juga melunasi tagihannya — tanpa ini
        // invoice tetap "Belum Dibayar" dan klien terus dikirimi pengingat
        // jatuh tempo untuk uang yang sudah mereka bayar.
        PelunasanInvoice::sinkron($transaksi->id_event);

        return back();
    }

    /** Ubah nominal / tanggal / bukti sebuah pembayaran. */
    public function update(Request $request, $id)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'nominal'    => 'required|numeric|min:1|max:9999999999999',
            'tgl_bayar'  => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'bukti_file' => 'nullable|file|image|max:2048',
        ]);

        $transaksi = Transaksi::findOrFail($id);
        $data = $request->only(['nominal', 'tgl_bayar', 'keterangan']);

        if ($request->hasFile('bukti_file') && $request->file('bukti_file')->isValid()) {
            if ($transaksi->bukti_file) {
                Storage::disk('local')->delete('bukti-transaksi/' . $transaksi->bukti_file);
            }
            $file     = $request->file('bukti_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('bukti-transaksi', $file, $filename);
            $data['bukti_file'] = $filename;
        }

        $lama = $transaksi->id_event;
        $transaksi->update($data);

        // Nominal atau eventnya bisa berubah — hitung ulang keduanya.
        PelunasanInvoice::sinkron($lama);
        if ($transaksi->id_event !== $lama) {
            PelunasanInvoice::sinkron($transaksi->id_event);
        }

        return back();
    }

    /** Hapus sebuah pembayaran. */
    public function destroy($id)
    {
        $this->checkTransaksiAkses();

        $transaksi = Transaksi::findOrFail($id);
        $idEvent   = $transaksi->id_event;

        if ($transaksi->bukti_file) {
            Storage::disk('local')->delete('bukti-transaksi/' . $transaksi->bukti_file);
        }
        $transaksi->delete();

        // Uang ditarik kembali → status tagihannya ikut dihitung ulang.
        PelunasanInvoice::sinkron($idEvent);

        return back();
    }

    /** Tambah item pemasukan / pengeluaran lain untuk sebuah event. */
    public function storeItem(Request $request)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'id_event'   => 'required|exists:events,id_event',
            'tipe'       => 'required|in:Pemasukan,Pengeluaran',
            'nama_item'  => 'required|string|max:255',
            'qty'        => 'required|integer|min:1|max:100000',
            'harga'      => 'required|numeric|min:0|max:9999999999999',
            'keterangan' => 'nullable|string|max:2000',
        ]);

        TransaksiItem::create([
            'id_event'   => $request->id_event,
            'tipe'       => $request->tipe,
            'nama_item'  => $request->nama_item,
            'qty'        => $request->qty,
            'harga'      => $request->harga,
            'total'      => $request->qty * $request->harga,
            'keterangan' => $request->keterangan,
        ]);

        return back();
    }

    /** Ubah item pemasukan / pengeluaran. */
    public function updateItem(Request $request, $id)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'tipe'       => 'required|in:Pemasukan,Pengeluaran',
            'nama_item'  => 'required|string|max:255',
            'qty'        => 'required|integer|min:1|max:100000',
            'harga'      => 'required|numeric|min:0|max:9999999999999',
            'keterangan' => 'nullable|string|max:2000',
        ]);

        $item = TransaksiItem::findOrFail($id);
        $item->update([
            'tipe'       => $request->tipe,
            'nama_item'  => $request->nama_item,
            'qty'        => $request->qty,
            'harga'      => $request->harga,
            'total'      => $request->qty * $request->harga,
            'keterangan' => $request->keterangan,
        ]);

        return back();
    }

    /** Hapus item pemasukan / pengeluaran. */
    public function destroyItem($id)
    {
        $this->checkTransaksiAkses();

        TransaksiItem::findOrFail($id)->delete();

        return back();
    }
}
