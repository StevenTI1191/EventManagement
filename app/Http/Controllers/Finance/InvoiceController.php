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

    /** Persentase uang muka. */
    private const PERSEN_DP = 0.5;

    public function index()
    {
        $this->checkFinance();

        $events = Event::eksternal()
            ->whereIn('status_event', [Event::STATUS_DEAL, Event::STATUS_UPCOMING])
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

        Invoice::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => Auth::guard('pegawai')->id(),
            'nomor_invoice'   => Invoice::generateNomor(),
            'tipe'            => $tipe,
            'nominal'         => $nominal,
            'tgl_terbit'      => now()->toDateString(),
            'tgl_jatuh_tempo' => now()->addDays(7)->toDateString(),
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
            $invoice->update(['status' => Invoice::STATUS_LUNAS]);

            // DP lunas → event resmi berjalan (masuk Task Divisi & kalender operasional).
            if ($invoice->tipe === Invoice::TIPE_DP && $invoice->event?->status_event === Event::STATUS_DEAL) {
                $invoice->event->update(['status_event' => Event::STATUS_UPCOMING]);
            }
        });

        $pesan = $invoice->tipe === Invoice::TIPE_DP
            ? 'DP ditandai lunas. Status event berubah menjadi Upcoming.'
            : 'Pelunasan ditandai lunas.';

        return back()->with('success', $pesan);
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
        $sapaan  = $event->client->nama_client ?? 'Bapak/Ibu';
        $nominal = 'Rp ' . number_format((float) $invoice->nominal, 0, ',', '.');
        $tempo   = $invoice->tgl_jatuh_tempo
            ? $invoice->tgl_jatuh_tempo->translatedFormat('d F Y')
            : null;

        if ($invoice->tipe === Invoice::TIPE_DP) {
            $teks = "Halo {$sapaan}, terima kasih atas kepercayaannya. Berikut invoice uang muka (DP 50%) "
                . "untuk acara \"{$event->nama_event}\" sebesar {$nominal}.";
        } else {
            $teks = "Halo {$sapaan}, kami ingatkan untuk pelunasan acara \"{$event->nama_event}\" "
                . "sebesar {$nominal} (sisa 50%).";
        }

        if ($tempo) {
            $teks .= " Mohon diselesaikan paling lambat {$tempo}.";
        }

        return $teks . " File invoice kami lampirkan pada pesan ini. Terima kasih. — PT Laksamana Muda Bersatu";
    }
}
