<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Invoice;
use App\Support\Wa;
use App\Traits\ChecksPegawaiRole;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Alur penagihan event EKSTERNAL:
 *   Deal      -> Finance menerbitkan invoice DP 50%
 *   DP Lunas  -> status event otomatis menjadi Upcoming
 *   Upcoming  -> Finance menerbitkan invoice Pelunasan 50% + reminder WA
 */
class InvoiceController extends Controller
{
    use ChecksPegawaiRole;

    /** Persentase uang muka (alias dari konstanta bersama di model Invoice). */
    private const PERSEN_DP = Invoice::PERSEN_DP;

    public function index()
    {
        $this->checkFinance();

        $events = Event::eksternal()
            ->where(function ($q) {
                // Penyelesaian ikut: acara sudah lewat tapi sering justru di situlah
                // pelunasan belum beres — jangan sampai hilang dari halaman Invoice.
                $q->whereIn('status_event', [Event::STATUS_DEAL, Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN])
                  // Event Done yang masih menyimpan tagihan belum lunas ikut tampil.
                  // Status Done bisa diset manual dari form, jadi event bisa ditutup
                  // sementara tagihannya menggantung. Dashboard Finance menghitungnya
                  // sebagai piutang lewat untukFinance() yang memang mencakup Done —
                  // tanpa baris di sini, uang itu terlihat di angka tapi tak ada
                  // tempat untuk menindaklanjutinya.
                  ->orWhere(function ($d) {
                      $d->where('status_event', Event::STATUS_DONE)
                        ->whereHas('invoices', fn ($i) => $i->where('status', Invoice::STATUS_BELUM));
                  });
            })
            ->with(['client:id,nama_client,perusahaan_client,no_telp_client', 'invoices'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (Event $e) {
                $total = (float) ($e->deal_harga_event ?? 0);
                $dp    = round($total * self::PERSEN_DP);

                $e->nominal_dp        = $dp;
                $e->nominal_pelunasan = $total - $dp;

                // Sisipkan link WhatsApp siap kirim untuk tiap invoice yang sudah terbit.
                $e->invoices->each(function (Invoice $inv) use ($e) {
                    $inv->wa_link = Wa::link($e->client->no_telp_client ?? null, $this->pesanInvoice($e, $inv));
                });

                return $e;
            });

        return Inertia::render('Finance/Invoice/Index', [
            'events' => $events,
        ]);
    }

    /** Terbitkan invoice DP atau Pelunasan untuk sebuah event. */
    public function store(Request $request, $id_event)
    {
        $this->checkFinance();

        $request->validate([
            'tipe' => ['required', Rule::in([Invoice::TIPE_DP, Invoice::TIPE_PELUNASAN])],
        ]);

        $event = Event::eksternal()->with('invoices')->findOrFail($id_event);
        $tipe  = $request->tipe;
        $total = (float) ($event->deal_harga_event ?? 0);

        if ($total <= 0) {
            return back()->with('error', 'Deal harga event belum diisi, invoice tidak bisa diterbitkan.');
        }

        if ($event->invoices->where('tipe', $tipe)->isNotEmpty()) {
            return back()->with('error', "Invoice {$tipe} untuk event ini sudah pernah diterbitkan.");
        }

        if ($tipe === Invoice::TIPE_DP && $event->status_event !== Event::STATUS_DEAL) {
            return back()->with('error', 'Invoice DP hanya bisa diterbitkan saat event berstatus Deal.');
        }

        if ($tipe === Invoice::TIPE_PELUNASAN) {
            $dpLunas = $event->invoices
                ->where('tipe', Invoice::TIPE_DP)
                ->where('status', Invoice::STATUS_LUNAS)
                ->isNotEmpty();

            if (!$dpLunas) {
                return back()->with('error', 'Invoice pelunasan baru bisa diterbitkan setelah DP lunas.');
            }
        }

        $dp      = round($total * self::PERSEN_DP);
        $nominal = $tipe === Invoice::TIPE_DP ? $dp : ($total - $dp);

        // Jatuh tempo — keduanya HARUS lunas sebelum hari-H acara:
        //  - DP        : dibayar segera untuk mengamankan booking (maks 7 hari
        //    sejak terbit), namun tidak boleh melewati sehari sebelum acara.
        //  - Pelunasan : paling lambat sehari sebelum acara berlangsung (H-1).
        $mulai   = \Illuminate\Support\Carbon::parse($event->tgl_mulai_event);
        $hMinus1 = $mulai->copy()->subDay(); // sehari sebelum hari-H

        if ($tipe === Invoice::TIPE_DP) {
            $jatuhTempo = now()->addDays(7);
            if ($jatuhTempo->gt($hMinus1)) {
                $jatuhTempo = $hMinus1;
            }
        } else {
            $jatuhTempo = $hMinus1;
        }

        // Bila acara sudah dekat/lewat saat invoice terbit, jangan menaruh
        // jatuh tempo di masa lampau — minta dibayar segera.
        if ($jatuhTempo->lt(now())) {
            $jatuhTempo = now();
        }

        Invoice::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => Auth::guard('pegawai')->id(),
            'nomor_invoice'   => Invoice::generateNomor(),
            'tipe'            => $tipe,
            'nominal'         => $nominal,
            'tgl_terbit'      => now()->toDateString(),
            'tgl_jatuh_tempo' => $jatuhTempo->toDateString(),
            'status'          => Invoice::STATUS_BELUM,
        ]);

        return back()->with('success', "Invoice {$tipe} berhasil diterbitkan.");
    }

    /** Unduh PDF invoice (juga dipakai untuk dilampirkan ke WhatsApp). */
    public function download($id_invoice)
    {
        $this->checkFinance();

        $invoice = Invoice::with('event.client')->findOrFail($id_invoice);

        return $this->pdfInvoice($invoice);
    }

    /**
     * Tandai invoice lunas (pembayaran diinput manual oleh Finance).
     * Khusus DP: status event otomatis naik menjadi Upcoming.
     */
    public function lunas($id_invoice)
    {
        $this->checkFinance();

        $invoice = Invoice::with('event')->findOrFail($id_invoice);

        if ($invoice->status === Invoice::STATUS_LUNAS) {
            return back()->with('error', 'Invoice ini sudah berstatus lunas.');
        }

        DB::transaction(function () use ($invoice) {
            // Catat pembayaran ke buku kas untuk sisa tagihan invoice ini yang
            // belum tertutup bukti. Tanpa transaksi ini: (1) uangnya tidak masuk
            // laporan Finance, dan (2) status Lunas bisa terbalik jadi Belum saat
            // PelunasanInvoice::sinkron dijalankan (mis. verifikasi bukti lain),
            // karena sinkron menghitung ulang status dari buku kas.
            $sudahBukti = (float) \App\Models\BuktiPembayaran::where('id_invoice', $invoice->id_invoice)
                ->where('status', 'Diverifikasi')
                ->sum('nominal');
            $gap = (float) $invoice->nominal - $sudahBukti;

            if ($gap > 0.0) {
                \App\Models\Transaksi::create([
                    'id_event'   => $invoice->id_event,
                    'id_pegawai' => Auth::guard('pegawai')->id(),
                    'nominal'    => $gap,
                    'tgl_bayar'  => now()->toDateString(),
                    'keterangan' => 'Pelunasan manual — invoice ' . $invoice->nomor_invoice,
                ]);
            }

            $invoice->update(['status' => Invoice::STATUS_LUNAS]);

            // DP lunas → event resmi berjalan (masuk Task Divisi & kalender operasional).
            if ($invoice->tipe === Invoice::TIPE_DP && $invoice->event?->status_event === Event::STATUS_DEAL) {
                $invoice->event->update(['status_event' => Event::STATUS_UPCOMING]);
            }
        });

        $pesan = $invoice->tipe === Invoice::TIPE_DP
            ? 'DP ditandai lunas & tercatat di buku kas. Status event berubah menjadi Upcoming.'
            : 'Pelunasan ditandai lunas & tercatat di buku kas.';

        return back()->with('success', $pesan);
    }

    /**
     * Ubah nominal, jatuh tempo, atau keterangan invoice yang belum lunas.
     * Invoice yang sudah Lunas tidak bisa diubah agar riwayat pembayaran konsisten.
     */
    public function update(Request $request, $id_invoice)
    {
        $this->checkFinance();

        $invoice = Invoice::findOrFail($id_invoice);

        if ($invoice->status === Invoice::STATUS_LUNAS) {
            return back()->with('error', 'Invoice yang sudah lunas tidak bisa diubah.');
        }

        $data = $request->validate([
            'nominal'         => 'required|numeric|min:1|max:9999999999999',
            'tgl_jatuh_tempo' => 'required|date',
            'keterangan'      => 'nullable|string|max:500',
        ]);

        $invoice->update($data);

        return back()->with('success', 'Invoice berhasil diperbarui.');
    }

    /** Susun PDF invoice dari data invoice. */
    private function pdfInvoice(Invoice $invoice)
    {
        $event = $invoice->event;

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice'        => $invoice,
            'event'          => $event,
            'tglTerbit'      => optional($invoice->tgl_terbit)->translatedFormat('d F Y'),
            'tglJatuhTempo'  => optional($invoice->tgl_jatuh_tempo)?->translatedFormat('d F Y'),
            'tglAcara'       => $event->tgl_mulai_event
                ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
                : '—',
        ]);

        return $pdf->download('Invoice-' . Str::slug($invoice->nomor_invoice) . '-' . Str::slug($event->nama_event) . '.pdf');
    }

    /** Teks WhatsApp untuk pengiriman invoice / reminder pelunasan. */
    private function pesanInvoice(Event $event, Invoice $invoice): string
    {
        $nama     = $event->client?->nama_client ?: 'Bapak/Ibu';
        $pt       = $event->client?->perusahaan_client ? " dari {$event->client->perusahaan_client}" : '';
        $nominal  = 'Rp ' . number_format((float) $invoice->nominal, 0, ',', '.');
        $tglAcara = $event->tgl_mulai_event
            ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
            : '-';
        $tempo    = $invoice->tgl_jatuh_tempo
            ? $invoice->tgl_jatuh_tempo->translatedFormat('d F Y')
            : null;
        $jenis    = $invoice->tipe === Invoice::TIPE_DP ? 'uang muka (DP 50%)' : 'pelunasan (sisa 50%)';

        $pesan  = "Halo Bapak/Ibu {$nama}{$pt},\n\n";
        $pesan .= "Terima kasih atas kepercayaan Anda kepada *PT Laksamana Muda Bersatu*. "
                . "Berikut kami sampaikan invoice {$jenis} untuk acara:\n\n";
        $pesan .= "📌 *{$event->nama_event}*\n";
        $pesan .= "🗓️ {$tglAcara}\n";
        $pesan .= "🧾 No. Invoice: {$invoice->nomor_invoice}\n";
        $pesan .= "💰 Jumlah: *{$nominal}*\n";
        if ($tempo) { $pesan .= "⏰ Jatuh tempo: *{$tempo}*\n"; }
        $pesan .= "\nMohon pembayaran dilakukan ke rekening resmi kami, lalu *unggah bukti transfer* melalui "
                . "portal klien agar dapat segera kami verifikasi. Berkas *invoice (PDF)* kami lampirkan pada pesan ini.\n\n";
        $pesan .= "Bila ada pertanyaan, jangan ragu menghubungi kami. Terima kasih. 🙏\n";
        $pesan .= "— Tim Finance, PT Laksamana Muda Bersatu";

        return $pesan;
    }
}
