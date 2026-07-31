<?php

namespace App\Mail;

use App\Models\Event;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Dikirim ke klien saat tim menaikkan acaranya ke tahap Negotiation — yakni
 * saat penawaran resmi dikirimkan. Dokumen penawaran (PDF) ikut dilampirkan
 * sehingga klien bisa langsung meninjau rincian & harga tanpa membuka portal.
 */
class PenawaranDikirim extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->event->nama_event);

        return new Envelope(subject: 'Penawaran Acara — ' . $namaEvent);
    }

    public function content(): Content
    {
        $e = $this->event;

        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Penawaran Acara untuk Anda',
            'subjudul' => $e->nama_event,
            'ikon'     => '📩',
            'nada'     => 'emas',
            'sapaan'   => 'Halo, ' . ($e->client?->nama_client ?? 'Klien') . '!',
            'paragraf' => ['Terima kasih atas kepercayaan Anda. Berikut penawaran yang kami siapkan — dokumen lengkapnya terlampir pada surel ini.'],
            'sorotan'  => 'Total penawaran: Rp ' . number_format((float) ($e->deal_harga_event ?? 0), 0, ',', '.'),
            'detail'   => array_filter([
                'Acara'    => $e->nama_event,
                'Kategori' => $e->kategori_event,
                'Tanggal'  => $e->tgl_mulai_event
                    ? \Illuminate\Support\Carbon::parse($e->tgl_mulai_event)->translatedFormat('l, d F Y') : null,
                'Waktu'    => $e->jam_mulai
                    ? substr((string) $e->jam_mulai, 0, 5) . ' – ' . substr((string) $e->jam_selesai, 0, 5) . ' WIB' : null,
                'Lokasi'   => $e->area_event,
                'Jumlah tamu' => $e->jumlah_pax ? $e->jumlah_pax . ' orang' : null,
            ]),
            'penutup'  => 'Silakan tinjau melalui portal klien, lalu terima penawaran ini atau ajukan penyesuaian bila ada yang ingin dibahas.',
            'catatan'  => null, 'tombol' => null,
        ]);
    }

    public function attachments(): array
    {
        $event = $this->event;

        $pdf = Pdf::loadView('pdf.penawaran', [
            'event'    => $event,
            'nomor'    => 'PNW/' . now()->format('Y/m') . '/' . str_pad((string) $event->id_event, 4, '0', STR_PAD_LEFT),
            'tanggal'  => now()->translatedFormat('d F Y'),
            'tglAcara' => $event->tgl_mulai_event
                ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
                : '-',
            'jam'      => substr((string) $event->jam_mulai, 0, 5) . ' – ' . substr((string) $event->jam_selesai, 0, 5) . ' WIB',
        ]);

        return [
            Attachment::fromData(fn () => $pdf->output(), 'Penawaran-' . Str::slug($event->nama_event) . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
