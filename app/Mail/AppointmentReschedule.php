<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentReschedule extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '🔄 Jadwal Appointment Anda Diubah — Laksamana Muda Bersama');
    }

    public function content(): Content
    {
        $a = $this->appointment;
        $tgl = $a->tgl_konfirmasi ?: $a->tgl_request;
        $jam = $a->jam_konfirmasi ?: $a->jam_request;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Jadwal Appointment Diubah',
            'subjudul' => $a->jenis_event,
            'ikon'     => '🔄',
            'nada'     => 'jingga',
            'sapaan'   => 'Halo, ' . ($a->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Jadwal pertemuan Anda kami sesuaikan. Mohon periksa waktu barunya di bawah ini.'],
            'sorotan'  => $tgl
                ? \Illuminate\Support\Carbon::parse($tgl)->translatedFormat('l, d F Y')
                    . ' pukul ' . substr((string) $jam, 0, 5) . ' WIB'
                : null,
            'detail'   => array_filter([
                'Jenis acara' => $a->jenis_event,
            ]),
            'catatan'  => $a->catatan_em,
            'penutup'  => 'Bila waktu tersebut kurang sesuai, silakan usulkan jadwal lain melalui portal klien.',
            'tombol'   => null,
        ]);
    }
}
