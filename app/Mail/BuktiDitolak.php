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
        return new Content(view: 'emails.bukti-ditolak');
    }
}
