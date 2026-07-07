<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    public function index()
    {
        $this->checkEventMarketing();

        $events = Event::with(['client', 'pic', 'transaksis', 'transaksiItems'])
            ->where('status_event', '!=', 'Planning')
            ->orderByDesc('tgl_mulai_event')
            ->take(100) // Batasi 100 event terbaru agar tidak OOM
            ->get()
            ->map(function ($event) {
                $totalDibayar     = $event->transaksis->sum('nominal');
                $totalPengeluaran = $event->transaksiItems->where('tipe', 'Pengeluaran')->sum('total');
                $deal             = $event->deal_harga_event;
                $sisa             = $deal - $totalDibayar;
                $labaBersih       = $totalDibayar - $totalPengeluaran;
                $status           = $totalDibayar >= $deal && $deal > 0 ? 'Lunas' : 'Belum Lunas';

                return [
                    'id_event'          => $event->id_event,
                    'nama_event'        => $event->nama_event,
                    'tgl_event'         => $event->tgl_mulai_event,
                    'client'            => $event->client?->nama_client,
                    'perusahaan'        => $event->client?->perusahaan_client,
                    'deal'              => $deal,
                    'total_dibayar'     => $totalDibayar,
                    'sisa'              => $sisa,
                    'total_pengeluaran' => $totalPengeluaran,
                    'laba_bersih'       => $labaBersih,
                    'status'            => $status,
                    'pembayarans'       => $event->transaksis->map(fn($t) => [
                        'id_transaksi' => $t->id_transaksi,
                        'nominal'      => $t->nominal,
                        'tgl_bayar'    => $t->tgl_bayar,
                        'keterangan'   => $t->keterangan,
                        'bukti_file'   => $t->bukti_file,
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

        return Inertia::render('EventMarketing/Transaksi/Index', [
            'events' => $events,
        ]);
    }
}
