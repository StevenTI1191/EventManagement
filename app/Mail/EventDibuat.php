<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventDibuat extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->event->nama_event);
        return new Envelope(subject: 'Event Anda Telah Dikonfirmasi — ' . $namaEvent);
    }

    public function content(): Content
    {
        $e = $this->event;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Acara Anda Telah Terdaftar',
            'subjudul' => $e->nama_event,
            'ikon'     => '🎉',
            'nada'     => 'hijau',
            'sapaan'   => 'Halo, ' . ($e->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Acara Anda sudah tercatat dalam sistem kami. Berikut rincian yang kami simpan.'],
            'detail'   => array_filter([
                'Acara'    => $e->nama_event,
                'Kategori' => $e->kategori_event,
                'Tanggal'  => $e->tgl_mulai_event
                    ? \Illuminate\Support\Carbon::parse($e->tgl_mulai_event)->translatedFormat('l, d F Y') : null,
                'Waktu'    => $e->jam_mulai
                    ? substr((string) $e->jam_mulai, 0, 5) . ' – ' . substr((string) $e->jam_selesai, 0, 5) . ' WIB' : null,
                'Lokasi'   => $e->area_event,
                'Jumlah tamu' => $e->jumlah_pax ? $e->jumlah_pax . ' orang' : null,
                'Penanggung jawab' => $e->pic?->nama_pegawai,
            ]),
            'penutup'  => 'Progres persiapan acara dapat Anda pantau kapan saja melalui portal klien.',
            'sorotan'  => null, 'catatan' => null, 'tombol' => null,
        ]);
    }
}
