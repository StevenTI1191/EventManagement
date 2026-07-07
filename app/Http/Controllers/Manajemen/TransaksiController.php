<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use App\Models\Event;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use Illuminate\Support\Facades\Storage;

class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    public function index(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'bulan'  => 'nullable|integer|min:1|max:12',
            'tahun'  => 'nullable|integer|min:2000|max:2100',
            'status' => 'nullable|in:Lunas,Belum Lunas',
            'sort'   => 'nullable|in:tanggal,deal,nominal',
            'dir'    => 'nullable|in:asc,desc',
            'search' => 'nullable|string|max:255',
        ]);

        $query = Event::with(['client', 'pic', 'transaksis.pegawai', 'transaksiItems'])
            ->where('status_event', '!=', 'Planning');

        // Filter by bulan
        if ($request->filled('bulan')) {
            $query->whereMonth('tgl_mulai_event', $request->bulan);
        }

        // Filter by tahun
        if ($request->filled('tahun')) {
            $query->whereYear('tgl_mulai_event', $request->tahun);
        }

        // Filter by status lunas
        if ($request->status === 'Lunas') {
            $query->whereRaw('deal_harga_event > 0')
                  ->whereRaw('(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) >= deal_harga_event');
        } elseif ($request->status === 'Belum Lunas') {
            $query->whereRaw(
                '(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) < deal_harga_event'
            );
        }

        // Filter by search (nama event / client)
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_event', 'like', '%' . $request->search . '%')
                  ->orWhereHas('client', fn($c) => $c->where('nama_client', 'like', '%' . $request->search . '%'));
            });
        }

        // Sort
        $sort = $request->sort ?? 'tanggal';
        $dir  = $request->dir === 'asc' ? 'asc' : 'desc';

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
                $totalDibayar    = $event->transaksis->sum('nominal');
                $totalPengeluaran = $event->transaksiItems->where('tipe', 'Pengeluaran')->sum('total');
                $totalPemasukan  = $event->transaksiItems->where('tipe', 'Pemasukan')->sum('total');
                $deal            = $event->deal_harga_event;
                $sisa            = $deal - $totalDibayar;
                // Laba bersih = pembayaran klien + pemasukan tambahan (sponsor, dll) - pengeluaran
                $labaBersih      = $totalDibayar + $totalPemasukan - $totalPengeluaran;
                $status          = $totalDibayar >= $deal && $deal > 0 ? 'Lunas' : 'Belum Lunas';

                return [
                    'id_event'          => $event->id_event,
                    'nama_event'        => $event->nama_event,
                    'tgl_event'         => $event->tgl_mulai_event,
                    'client'            => $event->client?->nama_client,
                    'perusahaan'        => $event->client?->perusahaan_client,
                    'jumlah_pax'        => $event->jumlah_pax,
                    'harga_per_pax'     => $event->harga_per_pax,
                    'pic'               => $event->pic?->nama_pegawai,
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

        return Inertia::render('Manajemen/Transaksi/Index', [
            'events'  => $events,
            'filters' => $request->only(['bulan', 'tahun', 'status', 'sort', 'dir', 'search']),
        ]);
    }

    public function store(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'id_event'   => 'required|exists:events,id_event',
            'nominal'    => 'required|numeric|min:1|max:9999999999999',
            'tgl_bayar'  => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'bukti_file' => 'nullable|file|image|max:2048',
        ]);

        $data = $request->only(['id_event', 'nominal', 'tgl_bayar', 'keterangan']);
        $data['id_pegawai'] = auth()->guard('pegawai')->user()->id_pegawai;

        if ($request->hasFile('bukti_file') && $request->file('bukti_file')->isValid()) {
            $file     = $request->file('bukti_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('bukti-transaksi', $file, $filename);
            $data['bukti_file'] = $filename;
        }

        Transaksi::create($data);
        return back();
    }

    public function storeItem(Request $request)
    {
        $this->checkManajemen();

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

    public function destroy($id)
    {
        $this->checkManajemen();

        $transaksi = Transaksi::findOrFail($id);
        if ($transaksi->bukti_file) {
            Storage::disk('local')->delete('bukti-transaksi/' . $transaksi->bukti_file);
        }
        $transaksi->delete();
        return back();
    }

    public function destroyItem($id)
    {
        $this->checkManajemen();

        TransaksiItem::findOrFail($id)->delete();
        return back();
    }
    public function update(Request $request, $id)
    {
        $this->checkManajemen();

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

        $transaksi->update($data);
        return back();
    }

    public function updateItem(Request $request, $id)
    {
        $this->checkManajemen();

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
}
