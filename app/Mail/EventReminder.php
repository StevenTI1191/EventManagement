<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event $event,
        public int $hariLagi
    ) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->event->nama_event);
        return new Envelope(
            subject: "⏰ Reminder: {$this->hariLagi} Hari Lagi — {$namaEvent}"
        );
    }

    public function content(): Content
    {
        $e = $this->event;
        $sisa = (float) ($e->deal_harga_event ?? 0) - (float) ($e->transaksis?->sum('nominal') ?? 0);

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => $this->hariLagi . ' Hari Lagi Menuju Acara Anda',
            'subjudul' => $e->nama_event,
            'ikon'     => '⏰',
            'nada'     => $this->hariLagi <= 1 ? 'merah' : ($this->hariLagi <= 3 ? 'jingga' : 'emas'),
            'sapaan'   => 'Halo, ' . ($e->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Acara Anda semakin dekat. Berikut ringkasan kesiapannya.'],
            'sorotan'  => $e->tgl_mulai_event
                ? \Illuminate\Support\Carbon::parse($e->tgl_mulai_event)->translatedFormat('l, d F Y')
                    . ($e->jam_mulai ? ' pukul ' . substr((string) $e->jam_mulai, 0, 5) . ' WIB' : '')
                : null,
            'detail'   => array_filter([
                'Acara'   => $e->nama_event,
                'Lokasi'  => $e->area_event,
                'Jumlah tamu' => $e->jumlah_pax ? $e->jumlah_pax . ' orang' : null,
                'Pembayaran'  => $sisa > 0
                    ? 'Belum terbayar Rp ' . number_format($sisa, 0, ',', '.')
                    : 'Lunas',
                'Penanggung jawab' => $e->pic?->nama_pegawai,
            ]),
            'penutup'  => $sisa > 0
                ? 'Mohon pelunasan diselesaikan paling lambat tiga hari sebelum hari pelaksanaan.'
                : 'Seluruh pembayaran sudah lunas. Sampai jumpa di hari acara!',
            'catatan'  => null, 'tombol' => null,
        ]);
    }
}
