<?php

namespace App\Traits;

use App\Models\BuktiPembayaran;
use App\Support\Terbilang;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Pembuatan kwitansi (tanda terima pembayaran) dari sebuah bukti yang sudah
 * diverifikasi Finance. Dipakai bersama sisi Finance & sisi Klien agar isinya
 * persis sama.
 */
trait BuatKwitansi
{
    protected function kwitansiPdf(BuktiPembayaran $bukti)
    {
        $bukti->loadMissing(['event.client', 'client', 'invoice']);

        $event  = $bukti->event;
        $client = $bukti->client ?? $event?->client;

        $nominal = (float) ($bukti->nominal ?: ($bukti->invoice->nominal ?? 0));

        $keteranganBayar = $bukti->invoice
            ? ('Invoice ' . $bukti->invoice->tipe . ' (' . $bukti->invoice->nomor_invoice . ')')
            : 'Pembayaran acara';

        $tglTerima = optional($bukti->updated_at)->translatedFormat('d F Y') ?? now()->translatedFormat('d F Y');

        $nomor = 'KW/' . optional($bukti->created_at)->format('Y/m')
            . '/' . str_pad((string) $bukti->id, 4, '0', STR_PAD_LEFT);

        $pdf = Pdf::loadView('pdf.kwitansi', [
            'bukti'           => $bukti,
            'event'           => $event,
            'client'          => $client,
            'nomor'           => $nomor,
            'nominal'         => $nominal,
            'terbilang'       => Terbilang::konversi($nominal),
            'keteranganBayar' => $keteranganBayar,
            'metode'          => 'Transfer bank (bukti diverifikasi)',
            'tglTerima'       => $tglTerima,
            'tglAcara'        => $event && $event->tgl_mulai_event
                ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
                : '—',
        ]);

        $namaAcara = $event->nama_event ?? 'acara';

        return $pdf->download('Kwitansi-' . Str::slug($nomor) . '-' . Str::slug($namaAcara) . '.pdf');
    }
}
