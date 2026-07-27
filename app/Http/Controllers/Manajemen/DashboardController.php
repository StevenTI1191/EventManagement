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

        $totalEvent     = Event::terkonfirmasi()->count();
        $eventActive    = Event::whereIn('status_event', [Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN])->count();
        $eventDone      = Event::where('status_event', 'Done')->count();
        $totalClient    = Client::count();
        $totalTransaksi = \App\Models\Transaksi::count();
        $totalPenjualan = \App\Models\Transaksi::sum('nominal');

        // "Event Terbaru" hanya menampilkan acara yang AKAN datang (Upcoming),
        // diurutkan dari tanggal terdekat.
        $recentEvents = Event::with('client')
            ->where('status_event', Event::STATUS_UPCOMING)
            ->orderBy('tgl_mulai_event')
            ->take(5)->get();

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
        // Hanya pengguna internal sistem (EM/Manajemen/Finance) — staf eksternal
        // bukan penanggung jawab acara, jadi tidak ikut leaderboard.
        $topPic = Pegawai::withCount('events')
            ->where('jenis_pegawai', 'Internal')
            ->orderByDesc('events_count')
            ->take(5)
            ->get()
            ->map(fn($p) => [
                'nama'   => $p->nama_pegawai,
                'posisi' => $p->posisi_pegawai,
                'total'  => $p->events_count,
            ]);

        // ── Chart 5: Capaian omset tiap PIC Event Marketing ──────────────
        // Menggantikan donut "Status Event" yang hanya menghitung banyaknya
        // acara — angka itu sudah terwakili kartu ringkasan di atas. Yang
        // dibutuhkan Manajemen adalah membandingkan kontribusi tiap PIC.
        //
        // Definisinya sengaja dibuat sama persis dengan halaman Evaluasi
        // Kinerja, supaya satu pegawai tidak menunjukkan angka berbeda di dua
        // layar:
        //   Nilai deal — kesepakatan acara yang sudah terikat komitmen.
        //   Uang masuk — pembayaran yang benar-benar tercatat di buku kas.
        $emIds = Pegawai::whereRaw("LOWER(REPLACE(posisi_pegawai, ' ', '')) = 'eventmarketing'")
            ->pluck('nama_pegawai', 'id_pegawai');

        if ($emIds->isEmpty()) {
            $omsetPic = collect();
        } else {
            $kunci = $emIds->keys()->all();

            $deal = Event::untukFinance()
                ->whereIn('id_pegawai', $kunci)
                ->selectRaw('id_pegawai, SUM(deal_harga_event) as total')
                ->groupBy('id_pegawai')
                ->pluck('total', 'id_pegawai');

            // Uang masuk ditarik lewat acara yang dipegang PIC, bukan lewat
            // pencatat transaksinya — yang diukur kontribusi penanganan acara.
            $masuk = \App\Models\Transaksi::join('events', 'events.id_event', '=', 'transaksis.id_event')
                ->whereIn('events.id_pegawai', $kunci)
                ->selectRaw('events.id_pegawai as pic, SUM(transaksis.nominal) as total')
                ->groupBy('events.id_pegawai')
                ->pluck('total', 'pic');

            $omsetPic = $emIds
                ->map(fn ($nama, $id) => [
                    'nama'       => $nama,
                    'nilai_deal' => (float) ($deal[$id] ?? 0),
                    'uang_masuk' => (float) ($masuk[$id] ?? 0),
                ])
                ->values()
                // Yang belum menghasilkan apa pun tidak ditampilkan agar
                // grafiknya tetap terbaca; jumlahnya tetap terlihat di Evaluasi.
                ->filter(fn ($r) => $r['nilai_deal'] > 0 || $r['uang_masuk'] > 0)
                ->sortByDesc('nilai_deal')
                ->values();
        }

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
            'omsetPic'      => $omsetPic,
        ]);
    }
}
