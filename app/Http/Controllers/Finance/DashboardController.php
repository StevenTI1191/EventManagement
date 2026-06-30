<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class DashboardController extends Controller
{
    use ChecksPegawaiRole;

    public function index()
    {
        $this->checkFinance();

        // ── KPI UTAMA ──────────────────────────────────────────────
        $totalPenjualan   = Transaksi::sum('nominal');
        $totalPengeluaran = TransaksiItem::where('tipe', 'Pengeluaran')->sum('total');
        $totalPemasukan   = TransaksiItem::where('tipe', 'Pemasukan')->sum('total');
        // Laba bersih = pembayaran klien + pemasukan tambahan (sponsor, dll) - pengeluaran
        $labaBersih       = $totalPenjualan + $totalPemasukan - $totalPengeluaran;

        $totalDeal = Event::sum('deal_harga_event');
        // Piutang = jumlah kekurangan bayar PER EVENT (event yang lebih bayar tidak menutup yang kurang)
        $totalPiutang = Event::where('deal_harga_event', '>', 0)
            ->withSum('transaksis as total_dibayar', 'nominal')
            ->get()
            ->sum(fn ($e) => max($e->deal_harga_event - ($e->total_dibayar ?? 0), 0));

        // Status event — hitung di PHP untuk hindari konflik only_full_group_by
        $eventBelumLunas = Event::where('deal_harga_event', '>', 0)
            ->whereRaw('(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) < deal_harga_event')
            ->count();

        // ── CHART: Pemasukan vs Pengeluaran per bulan tahun ini ───
        $bulanLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

        $pemasukanPerBulan = Transaksi::selectRaw('MONTH(tgl_bayar) as bulan, SUM(nominal) as total')
            ->whereYear('tgl_bayar', now()->year)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan');

        $pengeluaranPerBulan = TransaksiItem::selectRaw('MONTH(created_at) as bulan, SUM(total) as total')
            ->where('tipe', 'Pengeluaran')
            ->whereYear('created_at', now()->year)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan');

        $chartData = collect(range(1, 12))->map(fn($b) => [
            'bulan'       => $bulanLabels[$b - 1],
            'pemasukan'   => $pemasukanPerBulan[$b]   ?? 0,
            'pengeluaran' => $pengeluaranPerBulan[$b] ?? 0,
        ]);

        // ── TRANSAKSI TERBARU ─────────────────────────────────────
        $recentTransaksi = Transaksi::with('event.client')
            ->latest('tgl_bayar')
            ->take(7)
            ->get()
            ->map(fn($t) => [
                'id'         => $t->id_transaksi,
                'nama_event' => $t->event?->nama_event ?? '-',
                'client'     => $t->event?->client?->nama_client ?? '-',
                'nominal'    => $t->nominal,
                'tgl_bayar'  => $t->tgl_bayar,
                'keterangan' => $t->keterangan,
            ]);

        // ── TOP 5 EVENT BY DEAL ───────────────────────────────────
        $topEvents = Event::with(['client', 'transaksis'])
            ->orderByDesc('deal_harga_event')
            ->take(5)
            ->get()
            ->map(function ($e) {
                $dibayar = $e->transaksis->sum('nominal');
                return [
                    'nama_event'  => $e->nama_event,
                    'client'      => $e->client?->nama_client ?? '-',
                    'deal'        => $e->deal_harga_event,
                    'dibayar'     => $dibayar,
                    'sisa'        => $e->deal_harga_event - $dibayar,
                    'status'      => $dibayar >= $e->deal_harga_event && $e->deal_harga_event > 0 ? 'Lunas' : 'Belum Lunas',
                ];
            });

        return Inertia::render('Finance/Dashboard', [
            'kpi' => [
                'totalPenjualan'   => $totalPenjualan,
                'totalPengeluaran' => $totalPengeluaran,
                'labaBersih'       => $labaBersih,
                'totalPiutang'     => max($totalPiutang, 0),
                'eventBelumLunas'  => $eventBelumLunas,
                'totalDeal'        => $totalDeal,
            ],
            'chartData'       => $chartData,
            'recentTransaksi' => $recentTransaksi,
            'topEvents'       => $topEvents,
        ]);
    }
}
