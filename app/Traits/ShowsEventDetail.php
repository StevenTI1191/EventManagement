<?php

namespace App\Traits;

use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use App\Support\Wa;
use Illuminate\Http\Request;
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
            'dokumentasi',
        ])->findOrFail($id_event);

        // Halaman ini hanya dibuka pegawai, dan panel Riwayat di dalamnya
        // memang bertugas menampilkan jejak internal. Inilah satu-satunya
        // tempat yang membukanya — lihat $hidden pada model Event.
        $event->makeVisible('jejak_event');

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
            // Status yang boleh diubah langsung dari halaman ini. Perpindahan
            // tahap pipeline tetap lewat papan, tapi acara yang sudah berjalan
            // memang ditutup manual dari sini.
            'statusManual' => in_array($event->status_event, Event::STATUS_MANUAL, true)
                ? Event::STATUS_MANUAL
                : [],
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
            // Appointment asal acara ini — supaya jejaknya tidak terputus dari
            // permintaan awal klien sampai acara berjalan.
            'appointments' => \App\Models\Appointment::where('id_event', $event->id_event)
                ->with('pegawai:id_pegawai,nama_pegawai')
                ->latest()
                ->get(['id', 'id_pegawai', 'jenis_event', 'status', 'tgl_request', 'jam_request',
                       'tgl_konfirmasi', 'jam_konfirmasi', 'catatan_meeting', 'estimasi_budget']),
            // Rincian to-do per kategori — hasil dari tahap perencanaan.
            'tugasPerKategori' => $event->tugas
                ->groupBy(fn ($t) => $t->kategori ?: 'Tanpa Kategori')
                ->map(fn ($g) => [
                    'total' => $g->count(),
                    'done'  => $g->where('status_tugas', 'Done')->count(),
                ]),
            'followUps'  => $followUps,
            'waFollowUp' => Wa::link($event->client?->no_telp_client, $this->pesanFollowUp($event)),
            'clients'    => Client::select('id', 'nama_client', 'perusahaan_client', 'sumber')
                ->orderBy('nama_client')->get(),
            'pegawais'   => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')
                ->orderBy('nama_pegawai')->get(),
            'routes'     => $routes,
        ]);
    }

    /**
     * Parameter route halaman detail, membawa penanda asal bila ada.
     * Tanpa ini, menyimpan form akan menghapus konteks "datang dari pipeline"
     * sehingga tombol kembali mengarah ke daftar Event — padahal event yang
     * baru saja dilengkapi justru tidak muncul di daftar itu.
     */
    protected function tujuanDetail(Request $request, Event $event): array
    {
        $params = ['id' => $event->id_event];

        if ($request->input('dari') === 'pipeline') {
            $params['dari'] = 'pipeline';
        }

        return $params;
    }

    /** Teks WhatsApp untuk menindaklanjuti event ini ke kliennya. */
    protected function pesanFollowUp(Event $event): string
    {
        $nama = $event->client?->nama_client ?: 'Bapak/Ibu';
        $pt   = $event->client?->perusahaan_client ? " dari {$event->client->perusahaan_client}" : '';
        $pic  = $event->pic?->nama_pegawai;
        $tgl  = $event->tgl_mulai_event
            ? \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
            : null;

        $pesan  = "Halo Bapak/Ibu {$nama}{$pt},\n\n";
        $pesan .= ($pic ? "Perkenalkan, saya {$pic} dari " : "Kami dari ")
                . "*PT Laksamana Muda Bersatu* — Event Organizer & Venue, Pekanbaru.\n\n";
        $pesan .= "Kami ingin menindaklanjuti rencana acara Anda berikut:\n";
        $pesan .= "📌 *{$event->nama_event}*\n";
        if ($tgl)               { $pesan .= "🗓️ {$tgl}\n"; }
        if ($event->area_event) { $pesan .= "📍 {$event->area_event}\n"; }
        $pesan .= "\nApakah ada yang bisa kami bantu untuk mematangkan konsep atau menjawab pertanyaan seputar acara ini? Dengan senang hati kami mendampingi setiap tahapnya hingga hari pelaksanaan.\n\n";
        $pesan .= "Terima kasih atas waktunya. 🙏\n";
        $pesan .= "— " . ($pic ? "{$pic}, " : '') . "PT Laksamana Muda Bersatu";

        return $pesan;
    }
}
