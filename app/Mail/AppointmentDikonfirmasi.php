<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentDikonfirmasi extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '✅ Appointment Anda Dikonfirmasi — Laksamana Muda Bersama');
    }

    public function content(): Content
    {
        $a = $this->appointment;
        $tgl = $a->tgl_konfirmasi ?: $a->tgl_request;
        $jam = $a->jam_konfirmasi ?: $a->jam_request;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Appointment Dikonfirmasi',
            'subjudul' => $a->jenis_event,
            'ikon'     => '✅',
            'nada'     => 'hijau',
            'sapaan'   => 'Halo, ' . ($a->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Tim kami telah mengonfirmasi jadwal pertemuan Anda. Berikut rinciannya.'],
            'sorotan'  => $tgl
                ? \Illuminate\Support\Carbon::parse($tgl)->translatedFormat('l, d F Y')
                    . ' pukul ' . substr((string) $jam, 0, 5) . ' WIB'
                : null,
            'detail'   => array_filter([
                'Jenis acara' => $a->jenis_event,
                'Jumlah tamu' => $a->jumlah_tamu ? $a->jumlah_tamu . ' orang' : null,
            ]),
            'catatan'  => $a->catatan_em,
            'penutup'  => 'Sampai jumpa pada waktu tersebut. Bila jadwal ini kurang sesuai, Anda dapat mengusulkan waktu lain melalui portal klien.',
            'tombol'   => null,
        ]);
    }
}
