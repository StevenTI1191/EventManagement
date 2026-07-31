<?php

namespace App\Mail;

use App\Models\BuktiPembayaran;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BuktiDitolak extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BuktiPembayaran $bukti) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->bukti->event?->nama_event ?? 'Event');
        return new Envelope(subject: 'Bukti Pembayaran Anda Ditolak — ' . $namaEvent);
    }

    public function content(): Content
    {
        $b = $this->bukti;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Bukti Pembayaran Ditolak',
            'subjudul' => $b->event?->nama_event,
            'ikon'     => '❌',
            'nada'     => 'merah',
            'sapaan'   => 'Halo, ' . ($b->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Mohon maaf, bukti pembayaran yang Anda unggah belum dapat kami terima. Silakan periksa kembali lalu unggah ulang melalui portal klien.'],
            'detail'   => array_filter([
                'Acara'   => $b->event?->nama_event,
                'Nominal' => 'Rp ' . number_format((float) $b->nominal, 0, ',', '.'),
            ]),
            'catatan'  => $b->catatan_finance ?? null,
            'penutup'  => 'Bila ada yang perlu ditanyakan, silakan hubungi tim kami.',
            'sorotan'  => null, 'tombol' => null,
        ]);
    }
}
