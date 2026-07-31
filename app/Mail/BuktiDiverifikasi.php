<?php

namespace App\Mail;

use App\Models\BuktiPembayaran;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BuktiDiverifikasi extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BuktiPembayaran $bukti) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->bukti->event?->nama_event ?? 'Event');
        return new Envelope(subject: 'Pembayaran Anda Telah Diverifikasi — ' . $namaEvent);
    }

    public function content(): Content
    {
        $b = $this->bukti;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Pembayaran Terverifikasi',
            'subjudul' => $b->event?->nama_event,
            'ikon'     => '✅',
            'nada'     => 'hijau',
            'sapaan'   => 'Halo, ' . ($b->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Bukti pembayaran yang Anda unggah sudah kami periksa dan dinyatakan sah. Terima kasih atas pembayarannya.'],
            'sorotan'  => 'Rp ' . number_format((float) $b->nominal, 0, ',', '.') . ' diterima',
            'detail'   => array_filter([
                'Acara'        => $b->event?->nama_event,
                'Nominal'      => 'Rp ' . number_format((float) $b->nominal, 0, ',', '.'),
                'Tanggal bayar'=> $b->tgl_bayar
                    ? \Illuminate\Support\Carbon::parse($b->tgl_bayar)->translatedFormat('d F Y') : null,
            ]),
            'penutup'  => 'Kwitansi resmi dapat Anda unduh sendiri melalui portal klien.',
            'catatan'  => null, 'tombol' => null,
        ]);
    }
}
