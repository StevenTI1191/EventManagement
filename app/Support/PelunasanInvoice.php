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

        $totalMasuk = (float) Transaksi::where('id_event', $idEvent)->sum('nominal');

        // Uang bertanda dihitung untuk tagihannya, TETAPI tidak melebihi nilai
        // tagihan itu.
        //
        // Sebelumnya seluruh nominal bertanda dikurangkan dari uang bebas,
        // termasuk bagian yang melampaui tagihannya. Kelebihan itu lalu lenyap
        // dari pembagian: tidak menutup tagihan itu (sudah lunas) dan tidak
        // pula tersedia bagi tagihan lain. Keadaan yang menimbulkannya sangat
        // wajar — klien membayar seluruh nilai kesepakatan dalam satu transfer
        // lalu menandainya pada tagihan uang muka. Akibatnya tagihan pelunasan
        // tetap berbunyi "Belum Dibayar" padahal uangnya sudah diterima penuh,
        // Tim Finance mengejar uang yang sudah ada di rekening, dan penjadwal
        // terus mengirimi klien pengingat jatuh tempo untuk tagihan yang sudah
        // mereka lunasi.
        //
        // Dengan membatasi tiap tagihan pada nilainya sendiri lebih dulu,
        // kelebihannya otomatis kembali menjadi uang bebas — dan jumlah yang
        // dibagikan tidak pernah melampaui uang yang benar-benar masuk.
        $dibayarPer = [];
        $terpakai   = 0.0;

        foreach ($invoices as $invoice) {
            $ditandai = (float) ($melekat[$invoice->id_invoice] ?? 0);
            $dipakai  = min($ditandai, (float) $invoice->nominal);

            $dibayarPer[$invoice->id_invoice] = $dipakai;
            $terpakai += $dipakai;
        }

        $bebas = max(0, $totalMasuk - $terpakai);

        // Sisanya dialirkan ke tagihan terlama lebih dulu, sebagaimana lazimnya
        // pelunasan — urutannya sudah ditetapkan orderBy('id_invoice') di atas.
        foreach ($invoices as $invoice) {
            $nominal = (float) $invoice->nominal;
            $dibayar = $dibayarPer[$invoice->id_invoice];

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
            // DP terpenuhi → langsung terbitkan invoice pelunasan (bila belum ada).
            Invoice::terbitkanPelunasanOtomatis($event);
        }
    }
}
