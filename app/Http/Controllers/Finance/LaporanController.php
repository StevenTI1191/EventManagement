<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use OpenSpout\Writer\XLSX\Options as XlsxOptions;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Border;
use OpenSpout\Common\Entity\Style\BorderPart;
use OpenSpout\Common\Entity\Style\CellAlignment;
use Carbon\Carbon;

use App\Traits\ChecksPegawaiRole;

class LaporanController extends Controller
{
    use ChecksPegawaiRole;


    public function index()
    {
        $this->checkFinance();
        return Inertia::render('Finance/Laporan/Index');
    }

    /**
     * Kumpulkan data laporan berdasarkan filter
     */
    private function getData(Request $request): array
    {
        // Validasi input sebelum diproses — mencegah Carbon::parse() throw exception dengan input invalid
        $request->validate([
            'tipe'     => 'nullable|in:bulan,tahun,custom',
            'bulan'    => 'nullable|integer|min:1|max:12',
            'tahun'    => 'nullable|integer|min:2000|max:2100',
            'tgl_awal' => 'nullable|date',
            'tgl_akhir'=> 'nullable|date',
        ]);

        $tipe      = $request->input('tipe', 'bulan');      // bulan | tahun | custom
        $bulan     = (int) $request->input('bulan', now()->month);
        $tahun     = (int) $request->input('tahun', now()->year);
        $tgl_awal  = $request->input('tgl_awal');
        $tgl_akhir = $request->input('tgl_akhir');

        // Tentukan range tanggal
        if ($tipe === 'bulan') {
            $start = Carbon::create($tahun, $bulan, 1)->startOfMonth();
            $end   = Carbon::create($tahun, $bulan, 1)->endOfMonth();
            $periode_label = $start->translatedFormat('F Y');
        } elseif ($tipe === 'tahun') {
            $start = Carbon::create($tahun, 1, 1)->startOfYear();
            $end   = Carbon::create($tahun, 12, 31)->endOfYear();
            $periode_label = 'Tahun ' . $tahun;
        } else {
            // Fallback ke bulan ini jika tanggal custom kosong
            if (!$tgl_awal || !$tgl_akhir) {
                $start = now()->startOfMonth();
                $end   = now()->endOfMonth();
            } else {
                $start = Carbon::parse($tgl_awal)->startOfDay();
                $end   = Carbon::parse($tgl_akhir)->endOfDay();
                // Pastikan start tidak lebih dari end
                if ($start->gt($end)) {
                    [$start, $end] = [$end, $start];
                }
            }
            $periode_label = $start->format('d/m/Y') . ' s/d ' . $end->format('d/m/Y');
        }

        $fmt = fn($v) => 'Rp ' . number_format($v ?? 0, 0, ',', '.');

        // Transaksi pembayaran
        $transaksiQuery = Transaksi::with(['event.client'])
            ->whereBetween('tgl_bayar', [$start->toDateString(), $end->toDateString()])
            ->orderBy('tgl_bayar');

        $transaksis = $transaksiQuery->get()->map(fn($t) => [
            'tgl_bayar'   => Carbon::parse($t->tgl_bayar)->format('d/m/Y'),
            'nama_event'  => $t->event?->nama_event ?? '-',
            'client'      => $t->event?->client?->nama_client ?? '-',
            'keterangan'  => $t->keterangan,
            'nominal'     => $fmt($t->nominal),
            'nominal_raw' => (float) $t->nominal,
        ])->toArray();

        $totalPemasukan = collect($transaksis)->sum('nominal_raw');

        // Item pengeluaran & pemasukan
        $items = TransaksiItem::with('event')
            ->whereHas('event', fn($q) => $q->whereBetween('tgl_mulai_event', [$start->toDateString(), $end->toDateString()]))
            ->orderBy('created_at')
            ->get()
            ->map(fn($i) => [
                'nama_event'  => $i->event?->nama_event ?? '-',
                'tipe'        => $i->tipe,
                'nama_item'   => $i->nama_item,
                'qty'         => $i->qty,
                'harga'       => $fmt($i->harga),
                'harga_raw'   => (float) $i->harga,
                'total'       => $fmt($i->total),
                'total_raw'   => (float) $i->total,
            ])->toArray();

        $totalPengeluaran   = collect($items)->where('tipe', 'Pengeluaran')->sum('total_raw');
        $totalPemasukanItem = collect($items)->where('tipe', 'Pemasukan')->sum('total_raw');
        // Total pemasukan = pembayaran klien + pemasukan tambahan (sponsor, dll)
        $totalPemasukan     = $totalPemasukan + $totalPemasukanItem;
        $labaBersih         = $totalPemasukan - $totalPengeluaran;

        // Rekap per event
        $events = Event::with(['client', 'transaksis', 'transaksiItems'])
            ->whereBetween('tgl_mulai_event', [$start->toDateString(), $end->toDateString()])
            ->orderBy('tgl_mulai_event')
            ->get();

        $rekap_event = $events->map(function ($ev) use ($fmt) {
            $terbayar    = $ev->transaksis->sum('nominal');
            $pengeluaran = $ev->transaksiItems->where('tipe', 'Pengeluaran')->sum('total');
            $pemasukan   = $ev->transaksiItems->where('tipe', 'Pemasukan')->sum('total');
            $deal        = $ev->deal_harga_event;
            $laba        = $terbayar + $pemasukan - $pengeluaran;
            $status      = $terbayar >= $deal && $deal > 0 ? 'Lunas' : 'Belum Lunas';

            return [
                'nama_event'      => $ev->nama_event,
                'client'          => $ev->client?->nama_client ?? '-',
                'deal'            => $fmt($deal),
                'deal_raw'        => (float) $deal,
                'terbayar'        => $fmt($terbayar),
                'terbayar_raw'    => (float) $terbayar,
                'pengeluaran'     => $fmt($pengeluaran),
                'pengeluaran_raw' => (float) $pengeluaran,
                'laba'            => $fmt($laba),
                'laba_raw'        => (float) $laba,
                'status'          => $status,
            ];
        })->toArray();

        $totalDeal    = $events->sum('deal_harga_event');
        $totalDibayar = $events->sum(fn($e) => $e->transaksis->sum('nominal'));
        $totalPiutang = max($totalDeal - $totalDibayar, 0);

        $summary = [
            'total_pemasukan'     => $fmt($totalPemasukan),
            'total_pemasukan_raw' => $totalPemasukan,
            'total_pengeluaran'     => $fmt($totalPengeluaran),
            'total_pengeluaran_raw' => $totalPengeluaran,
            'laba_bersih'         => $fmt($labaBersih),
            'laba_bersih_raw'     => $labaBersih,
            'total_piutang'       => $fmt($totalPiutang),
            'total_piutang_raw'   => $totalPiutang,
            'total_transaksi'     => count($transaksis),
        ];

        return compact('transaksis', 'items', 'rekap_event', 'summary', 'periode_label');
    }

    // PDF sekarang di-handle langsung dari React via window.print()

    public function exportExcel(Request $request)
    {
        $this->checkFinance();
        $data     = $this->getData($request);
        $filename = 'Laporan-Keuangan-' . str_replace([' ', '/'], ['-', '-'], $data['periode_label']) . '.xlsx';

        // Sheet 1 — Ringkasan
        $ringkasan = collect([
            ['Keterangan' => 'Periode',           'Nilai' => $data['periode_label']],
            ['Keterangan' => '',                   'Nilai' => ''],
            ['Keterangan' => 'Total Pemasukan',   'Nilai' => $data['summary']['total_pemasukan']],
            ['Keterangan' => 'Total Pengeluaran', 'Nilai' => $data['summary']['total_pengeluaran']],
            ['Keterangan' => 'Laba Bersih',       'Nilai' => $data['summary']['laba_bersih']],
            ['Keterangan' => 'Piutang',           'Nilai' => $data['summary']['total_piutang']],
            ['Keterangan' => 'Total Transaksi',   'Nilai' => $data['summary']['total_transaksi'] . ' transaksi'],
        ]);

        // Sheet 2 — Pembayaran
        $pembayaran = collect($data['transaksis'])->map(fn($t, $i) => [
            'No'         => $i + 1,
            'Tanggal'    => $t['tgl_bayar'],
            'Event'      => $t['nama_event'],
            'Client'     => $t['client'],
            'Keterangan' => $t['keterangan'] ?: '-',
            'Nominal'    => $t['nominal'],
        ]);

        // Sheet 3 — Item
        $items = collect($data['items'])->map(fn($item, $i) => [
            'No'        => $i + 1,
            'Event'     => $item['nama_event'],
            'Tipe'      => $item['tipe'],
            'Nama Item' => $item['nama_item'],
            'Qty'       => $item['qty'],
            'Harga'     => $item['harga'],
            'Total'     => $item['total'],
        ]);

        // Sheet 4 — Rekap Event
        $rekap = collect($data['rekap_event'])->map(fn($ev, $i) => [
            'No'          => $i + 1,
            'Event'       => $ev['nama_event'],
            'Client'      => $ev['client'],
            'Deal'        => $ev['deal'],
            'Terbayar'    => $ev['terbayar'],
            'Pengeluaran' => $ev['pengeluaran'],
            'Laba'        => $ev['laba'],
            'Status'      => $ev['status'],
        ]);

        // Buat folder temp yang writable
        $tempDir  = storage_path('app/excel-temp');
        if (!file_exists($tempDir)) mkdir($tempDir, 0755, true);
        $filePath = $tempDir . DIRECTORY_SEPARATOR . $filename;

        // Pakai OpenSpout langsung agar bisa set tempFolder (putenv tidak efektif di Windows)
        $options = new XlsxOptions();
        $options->setTempFolder($tempDir);
        $writer  = new XlsxWriter($options);
        $writer->openToFile($filePath);

        // Gaya tampilan tabel
        $headerStyle = (new Style())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('FF2D55')
            ->setCellAlignment(CellAlignment::CENTER)
            ->setBorder(new Border(
                new BorderPart(Border::BOTTOM, 'FF2D55', Border::WIDTH_THIN, Border::STYLE_SOLID),
                new BorderPart(Border::TOP,    'FF2D55', Border::WIDTH_THIN, Border::STYLE_SOLID),
            ));

        $dataStyle = (new Style())->setBorder(new Border(
            new BorderPart(Border::BOTTOM, 'E5E7EB', Border::WIDTH_THIN, Border::STYLE_SOLID),
            new BorderPart(Border::LEFT,   'E5E7EB', Border::WIDTH_THIN, Border::STYLE_SOLID),
            new BorderPart(Border::RIGHT,  'E5E7EB', Border::WIDTH_THIN, Border::STYLE_SOLID),
        ));

        // Lebar kolom per sheet (biar tidak terpotong)
        $colWidths = [
            'Ringkasan'               => [24, 30],
            'Pembayaran'              => [6, 16, 28, 22, 28, 20],
            'Pengeluaran & Pemasukan' => [6, 26, 14, 28, 8, 18, 18],
            'Rekap Event'             => [6, 24, 22, 20, 20, 20, 20, 16],
        ];

        $sheetsData = [
            'Ringkasan'               => $ringkasan,
            'Pembayaran'              => $pembayaran,
            'Pengeluaran & Pemasukan' => $items,   // dulu bernama "Item"
            'Rekap Event'             => $rekap,
        ];

        $firstSheet = true;
        foreach ($sheetsData as $sheetName => $collection) {
            if ($firstSheet) {
                $sheet = $writer->getCurrentSheet();
                $firstSheet = false;
            } else {
                $sheet = $writer->addNewSheetAndMakeItCurrent();
            }
            $sheet->setName($sheetName);

            // Atur lebar kolom sebelum menulis baris
            if (isset($colWidths[$sheetName])) {
                foreach ($colWidths[$sheetName] as $i => $w) {
                    $sheet->setColumnWidth((float) $w, $i + 1);
                }
            }

            $rows = $collection->toArray();
            if (empty($rows)) continue;

            // Header row (berwarna)
            $headers = array_keys($rows[0]);
            $writer->addRow(Row::fromValues($headers, $headerStyle));

            // Data rows (border tipis)
            foreach ($rows as $rowData) {
                $writer->addRow(Row::fromValues(array_values($rowData), $dataStyle));
            }
        }

        $writer->close();

        return response()->download($filePath, $filename)->deleteFileAfterSend(true);
    }

    public function preview(Request $request)
    {
        $this->checkFinance();
        $data = $this->getData($request);
        return response()->json($data);
    }
}
