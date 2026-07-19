<?php

namespace App\Support;

use App\Models\BuktiPembayaran;
use App\Models\Event;
use App\Models\Invoice;
use App\Models\Transaksi;

/**
 * Satu aturan pelunasan untuk semua jalur uang masuk.
 *
 * Uang bisa masuk lewat dua pintu: bukti yang diunggah klien lalu diverifikasi
 * Finance, dan transaksi yang dicatat Finance sendiri (mis. pembayaran tunai
 * atau transfer yang dilihat langsung). Sebelumnya hanya pintu pertama yang
 * memperbarui status invoice — pembayaran yang dicatat manual meninggalkan
 * tagihannya tetap "Belum Dibayar", sehingga penjadwal terus mengirimi klien
 * pengingat jatuh tempo untuk uang yang sudah mereka bayar, dan uang muka yang
 * dibayar tunai tidak pernah menaikkan event ke Upcoming.
 *
 * Cara membaginya: bukti yang menyebut invoice tertentu dihitung untuk invoice
 * itu; sisa uang yang tidak menyebut apa-apa dialirkan ke tagihan terlama lebih
 * dulu, sebagaimana lazimnya pelunasan.
 */
class PelunasanInvoice
{
    public static function sinkron(?int $idEvent): void
    {
        if (! $idEvent) {
            return;
        }

        $event = Event::find($idEvent);

        // Acara internal tidak menagih klien.
        if (! $event || $event->tipe_event !== Event::TIPE_EKSTERNAL) {
            return;
        }

        self::bagiKeInvoice($idEvent);
        self::naikkanBilaDpTerpenuhi($event);
    }

    /** Tetapkan status tiap invoice dari uang yang benar-benar masuk. */
    private static function bagiKeInvoice(int $idEvent): void
    {
        $invoices = Invoice::where('id_event', $idEvent)->orderBy('id_invoice')->get();

        if ($invoices->isEmpty()) {
            return;
        }

        // Uang yang menempel pada invoice tertentu (klien memilih tagihannya).
        $melekat = BuktiPembayaran::where('id_event', $idEvent)
            ->where('status', 'Diverifikasi')
            ->whereNotNull('id_invoice')
            ->get(['id_invoice', 'nominal'])
            ->groupBy('id_invoice')
            ->map(fn ($g) => (float) $g->sum('nominal'));

        // Seluruh uang yang tercatat resmi, dikurangi yang sudah punya tujuan.
        $totalMasuk = (float) Transaksi::where('id_event', $idEvent)->sum('nominal');
        $bebas      = max(0, $totalMasuk - $melekat->sum());

        foreach ($invoices as $invoice) {
            $nominal = (float) $invoice->nominal;
            $dibayar = (float) ($melekat[$invoice->id_invoice] ?? 0);

            if ($dibayar < $nominal && $bebas > 0) {
                $ambil    = min($bebas, $nominal - $dibayar);
                $dibayar += $ambil;
                $bebas   -= $ambil;
            }

            $status = $dibayar >= $nominal ? Invoice::STATUS_LUNAS : Invoice::STATUS_BELUM;

            if ($invoice->status !== $status) {
                $invoice->update(['status' => $status]);
            }
        }
    }

    /**
     * Uang muka terpenuhi → acara boleh berjalan. Idempotent, dan hanya
     * berlaku untuk event yang masih menunggu pembayaran di tahap Deal.
     */
    private static function naikkanBilaDpTerpenuhi(Event $event): void
    {
        if ($event->status_event !== Event::STATUS_DEAL) {
            return;
        }

        $totalDeal = (float) ($event->deal_harga_event ?? 0);
        if ($totalDeal <= 0) {
            return;
        }

        $dibayar = (float) Transaksi::where('id_event', $event->id_event)->sum('nominal');

        if ($dibayar >= Invoice::nominalDp($totalDeal)) {
            $event->update(['status_event' => Event::STATUS_UPCOMING]);
        }
    }
}
