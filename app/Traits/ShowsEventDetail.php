<?php

namespace App\Traits;

use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use App\Support\Wa;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman detail satu event: ringkasan lengkap, daftar periksa kelengkapan,
 * riwayat follow-up, dan form edit di bagian bawah.
 *
 * Dibuat karena event yang masih di pipeline (Lead/Negotiation/Deal) tidak
 * muncul di daftar Event — daftar itu menyaring terkonfirmasi() saja. Akibatnya
 * tidak ada satu pun tempat untuk mengisi jam, area, pax, dan deal harga,
 * padahal justru itu syarat agar kartunya boleh naik tahap. Kartu Lead pun
 * tersangkut permanen. Halaman ini yang menutup celah tersebut.
 */
trait ShowsEventDetail
{
    protected function halamanDetailEvent(string $komponen, $id_event, array $routes): Response
    {
        $event = Event::with([
            'client',
            'pic:id_pegawai,nama_pegawai,posisi_pegawai',
            'tugas',
            'invoices',
        ])->findOrFail($id_event);

        $total = $event->tugas->count();
        $done  = $event->tugas->where('status_tugas', 'Done')->count();

        // Riwayat follow-up khusus event ini — supaya jejak komunikasi tidak
        // tercampur dengan event lain milik klien yang sama.
        $followUps = $event->client
            ? $event->client->followUps()
                ->where('id_event', $event->id_event)
                ->with('pegawai:id_pegawai,nama_pegawai')
                ->latest()
                ->take(50)
                ->get()
            : collect();

        return Inertia::render($komponen, [
            'event'       => $event,
            'kelengkapan' => $event->kelengkapan(),
            'progres'     => [
                'total'  => $total,
                'done'   => $done,
                'persen' => $total ? (int) round($done / $total * 100) : 0,
            ],
            'tagihan' => [
                'deal'     => (float) $event->deal_harga_event,
                // Hanya pembayaran yang sudah tercatat resmi sebagai transaksi.
                'terbayar' => (float) $event->transaksis()->sum('nominal'),
            ],
            'followUps'  => $followUps,
            'waFollowUp' => Wa::link($event->client?->no_telp_client, $this->pesanFollowUp($event)),
            'clients'    => Client::select('id', 'nama_client', 'perusahaan_client', 'sumber')
                ->orderBy('nama_client')->get(),
            'pegawais'   => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')
                ->orderBy('nama_pegawai')->get(),
            'routes'     => $routes,
        ]);
    }

    /** Teks WhatsApp untuk menindaklanjuti event ini ke kliennya. */
    protected function pesanFollowUp(Event $event): string
    {
        $sapaan = $event->client->nama_client ?? 'Bapak/Ibu';

        return "Halo {$sapaan}, dari tim Laksamana Muda. Kami ingin menindaklanjuti "
            . "rencana acara \"{$event->nama_event}\". Apakah ada yang bisa kami bantu?";
    }
}
