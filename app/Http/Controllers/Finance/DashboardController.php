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
        // Populasinya disamakan dengan halaman Laporan lewat scope untukLaporan(),
        // supaya "Laba Bersih" pada dua layar ini menjawab pertanyaan yang sama.
        // Sebelumnya kartu di sini menjumlahkan SELURUH transaksi tanpa melihat
        // acaranya, sedangkan Laporan hanya menghitung acara yang terikat
        // komitmen — sehingga uang muka yang hangus dari acara batal muncul di
        // satu layar dan hilang di layar lainnya.
        $padaLaporan = fn ($q) => $q->untukLaporan();

        $totalPenjualan   = Transaksi::whereHas('event', $padaLaporan)->sum('nominal');
        $totalPengeluaran = TransaksiItem::whereHas('event', $padaLaporan)
            ->where('tipe', 'Pengeluaran')->sum('total');
        $totalPemasukan   = TransaksiItem::whereHas('event', $padaLaporan)
            ->where('tipe', 'Pemasukan')->sum('total');
        // Laba bersih = pembayaran klien + pemasukan tambahan (sponsor, dll) - pengeluaran
        $labaBersih       = $totalPenjualan + $totalPemasukan - $totalPengeluaran;

        // Hanya event yang benar-benar terikat komitmen (Deal/Upcoming/Done) yang
        // dihitung sebagai nilai deal & piutang. Prospek pipeline (Lead/Negotiation)
        // dan yang batal tidak punya kewajiban bayar, jadi dikecualikan.
        $totalDeal = Event::untukFinance()->sum('deal_harga_event');
        // Piutang = jumlah kekurangan bayar PER EVENT (event yang lebih bayar tidak menutup yang kurang)
        $totalPiutang = Event::untukFinance()->where('deal_harga_event', '>', 0)
            ->withSum('transaksis as total_dibayar', 'nominal')
            ->get()
            ->sum(fn ($e) => max($e->deal_harga_event - ($e->total_dibayar ?? 0), 0));

        // Status event — hitung di PHP untuk hindari konflik only_full_group_by
        $eventBelumLunas = Event::untukFinance()->where('deal_harga_event', '>', 0)
            ->whereRaw('(SELECT COALESCE(SUM(nominal),0) FROM transaksis WHERE transaksis.id_event = events.id_event) < deal_harga_event')
            ->count();

        // ── CHART: Pemasukan vs Pengeluaran per bulan tahun ini ───
        $bulanLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

        // Grafiknya memakai populasi yang sama dengan kartu KPI di atas, supaya
        // jumlah batangnya sepanjang tahun tidak berselisih dengan angka besar
        // yang tertera di kepala halaman yang sama.
        $pemasukanPerBulan = Transaksi::whereHas('event', $padaLaporan)
            ->selectRaw('MONTH(tgl_bayar) as bulan, SUM(nominal) as total')
            ->whereYear('tgl_bayar', now()->year)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan');

        $pengeluaranPerBulan = TransaksiItem::whereHas('event', $padaLaporan)
            ->selectRaw('MONTH(created_at) as bulan, SUM(total) as total')
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
        $topEvents = Event::untukFinance()->with(['client', 'transaksis'])
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
                    // Dibatasi nol, sama seperti perhitungan kartu Piutang di
                    // atas. Tanpa pembatas ini acara yang pembayarannya melampaui
                    // nilai deal menampilkan piutang bernilai minus, dan dua
                    // angka pada satu layar yang sama jadi saling bertentangan.
                    'sisa'        => max((float) $e->deal_harga_event - $dibayar, 0),
                    'status'      => Event::labelPembayaran((float) $e->deal_harga_event, (float) $dibayar),
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
