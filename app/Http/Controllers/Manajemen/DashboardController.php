<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Pegawai;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class DashboardController extends Controller
{
    use ChecksPegawaiRole;
    public function index()
    {
        $this->checkManajemen();

        $totalEvent     = Event::where('status_event', '!=', 'Planning')->count();
        $eventActive    = Event::where('status_event', 'Upcoming')->count();
        $eventDone      = Event::where('status_event', 'Done')->count();
        $totalClient    = Client::count();
        $totalTransaksi = \App\Models\Transaksi::count();
        $totalPenjualan = \App\Models\Transaksi::sum('nominal');

        $recentEvents = Event::with('client')->where('status_event', '!=', 'Planning')->latest()->take(5)->get();

        // ── Chart 1: Penjualan per bulan (tahun ini) ─────────────────────
        $bulanLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
        $salesRaw = \App\Models\Transaksi::selectRaw('MONTH(tgl_bayar) as bulan, SUM(nominal) as total')
            ->whereYear('tgl_bayar', now()->year)
            ->groupBy('bulan')->pluck('total', 'bulan');
        $salesChart = collect(range(1, 12))->map(fn($b) => [
            'bulan' => $bulanLabels[$b - 1],
            'total' => $salesRaw[$b] ?? 0,
        ]);

        // ── Chart 2: Distribusi event per kategori ────────────────────────
        $kategoriChart = Event::selectRaw("COALESCE(kategori_event, 'Lainnya') as kategori, COUNT(*) as total")
            ->groupBy('kategori')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => ['name' => $r->kategori, 'value' => (int) $r->total]);

        // ── Chart 3: Trend client baru per bulan (tahun ini) ─────────────
        $clientRaw = Client::selectRaw('MONTH(created_at) as bulan, COUNT(*) as total')
            ->whereYear('created_at', now()->year)
            ->groupBy('bulan')->pluck('total', 'bulan');
        $clientTrend = collect(range(1, 12))->map(fn($b) => [
            'bulan' => $bulanLabels[$b - 1],
            'total' => $clientRaw[$b] ?? 0,
        ]);

        // ── Chart 4: Top 5 PIC berdasarkan jumlah event ───────────────────
        $topPic = Pegawai::withCount('events')
            ->orderByDesc('events_count')
            ->take(5)
            ->get()
            ->map(fn($p) => [
                'nama'   => $p->nama_pegawai,
                'posisi' => $p->posisi_pegawai,
                'total'  => $p->events_count,
            ]);

        // ── Chart 5: Event per status (donut) ────────────────────────────
        $statusChart = Event::selectRaw('COALESCE(status_event, "Upcoming") as status, COUNT(*) as total')
            ->where('status_event', '!=', 'Planning')
            ->groupBy('status')
            ->get()
            ->map(fn($r) => ['name' => $r->status, 'value' => (int) $r->total]);

        return Inertia::render('Manajemen/Dashboard', [
            'stats' => [
                'totalEvent'     => $totalEvent,
                'eventActive'    => $eventActive,
                'eventDone'      => $eventDone,
                'totalClient'    => $totalClient,
                'totalTransaksi' => $totalTransaksi,
                'totalPenjualan' => $totalPenjualan,
            ],
            'recentEvents'  => $recentEvents,
            'salesChart'    => $salesChart,
            'kategoriChart' => $kategoriChart,
            'clientTrend'   => $clientTrend,
            'topPic'        => $topPic,
            'statusChart'   => $statusChart,
        ]);
    }
}
