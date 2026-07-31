<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentDiterima extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '🎉 Appointment Anda Telah Diterima — Laksamana Muda');
    }

    public function content(): Content
    {
        $a = $this->appointment;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Permintaan Appointment Diterima',
            'subjudul' => $a->jenis_event,
            'ikon'     => '🎉',
            'nada'     => 'hijau',
            'sapaan'   => 'Halo, ' . ($a->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Permintaan janji temu Anda sudah kami terima dan sedang ditinjau tim. Kami akan mengabari begitu jadwalnya dikonfirmasi.'],
            'detail'   => array_filter([
                'Jenis acara'   => $a->jenis_event,
                'Tanggal diminta' => $a->tgl_request
                    ? \Illuminate\Support\Carbon::parse($a->tgl_request)->translatedFormat('l, d F Y') : null,
                'Jam diminta'   => $a->jam_request ? substr((string) $a->jam_request, 0, 5) . ' WIB' : null,
                'Jumlah tamu'   => $a->jumlah_tamu ? $a->jumlah_tamu . ' orang' : null,
            ]),
            'catatan'  => $a->deskripsi_event,
            'penutup'  => 'Status appointment dapat Anda pantau kapan saja melalui portal klien.',
            'tombol'   => null, 'sorotan' => null,
        ]);
    }
}
