<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentDibatalkan extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '❌ Appointment Anda Dibatalkan — PT Laksamana Muda Bersatu');
    }

    public function content(): Content
    {
        $a = $this->appointment;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Appointment Dibatalkan',
            'subjudul' => $a->jenis_event,
            'ikon'     => '❌',
            'nada'     => 'merah',
            'sapaan'   => 'Halo, ' . ($a->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Mohon maaf, janji temu Anda dibatalkan. Anda dapat mengajukan jadwal baru kapan saja melalui portal klien.'],
            'detail'   => array_filter([
                'Jenis acara' => $a->jenis_event,
                'Jadwal semula' => $a->tgl_request
                    ? \Illuminate\Support\Carbon::parse($a->tgl_request)->translatedFormat('l, d F Y') : null,
            ]),
            'catatan'  => $a->catatan_em,
            'penutup'  => 'Terima kasih atas pengertiannya.',
            'sorotan'  => null, 'tombol' => null,
        ]);
    }
}
