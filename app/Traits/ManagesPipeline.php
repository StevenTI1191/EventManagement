<?php

namespace App\Traits;

use App\Models\Event;
use App\Support\Wa;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Logika papan pipeline (kanban) event EKSTERNAL:
 *   Lead -> Negotiation -> Deal
 * Setelah Deal, event ditangani Finance (invoice DP 50%). Begitu DP dibayar &
 * diverifikasi, status berubah menjadi Upcoming dan event keluar dari papan ini.
 *
 * Event INTERNAL (dari Planning Event) tidak masuk pipeline.
 */
trait ManagesPipeline
{
    /**
     * Isi papan pipeline, dikelompokkan per kolom.
     *
     * Yang ditampilkan:
     *  - Event eksternal di seluruh siklus hidup (Lead s/d Done).
     *  - Event Planning yang punya klien sasaran — ikut kolom Lead, karena
     *    rencana yang sudah menyasar klien pada dasarnya calon prospek.
     *  - Event Done hanya sampai beberapa hari setelah ditutup, lalu hilang
     *    dari papan supaya kolomnya tidak menumpuk selamanya.
     */
    protected function pipelineColumns(): array
    {
        $batasDone = now()->subDays(Event::PIPELINE_DONE_HARI);

        $events = Event::query()
            ->where(function ($q) use ($batasDone) {
                // Event klien di seluruh tahap (Done dibatasi umurnya)
                $q->where(function ($e) use ($batasDone) {
                    $e->where('tipe_event', Event::TIPE_EKSTERNAL)
                      ->whereIn('status_event', Event::PIPELINE_KOLOM)
                      ->where(function ($d) use ($batasDone) {
                          $d->where('status_event', '!=', Event::STATUS_DONE)
                            ->orWhere('updated_at', '>=', $batasDone);
                      });
                })
                // Rencana yang sudah menyasar klien tertentu
                ->orWhere(function ($p) {
                    $p->where('tipe_event', Event::TIPE_INTERNAL)
                      ->where('status_event', Event::STATUS_PLANNING)
                      ->whereNotNull('id_client');
                });
            })
            ->with([
                'client:id,nama_client,perusahaan_client,no_telp_client,sumber',
                'pic:id_pegawai,nama_pegawai',
            ])
            // Urutan first-in-first-out: prospek yang lebih dulu masuk tampil di
            // atas pada tiap kolom, supaya ditangani lebih dulu.
            ->orderBy('created_at')
            ->get();

        $events->each(function (Event $e) {
            // Link WhatsApp penawaran hanya relevan untuk prospek yang digarap.
            $e->wa_penawaran = Wa::link(
                $e->client->no_telp_client ?? null,
                $this->pesanPenawaran($e),
            );
            // Penanda kartu "rencana" agar dibedakan di papan.
            $e->dari_planning = $e->status_event === Event::STATUS_PLANNING;
        });

        $kolom = [];
        foreach (Event::PIPELINE_KOLOM as $status) {
            $kolom[$status] = $status === Event::STATUS_LEAD
                // Kolom Lead memuat prospek Lead + rencana bertarget klien
                ? $events->filter(fn (Event $e) => in_array($e->status_event, [Event::STATUS_LEAD, Event::STATUS_PLANNING], true))->values()
                : $events->where('status_event', $status)->values();
        }

        return $kolom;
    }

    /** Teks WhatsApp yang menyertai pengiriman penawaran. */
    protected function pesanPenawaran(Event $event): string
    {
        $nama  = $event->client?->nama_client ?: 'Bapak/Ibu';
        $pt    = $event->client?->perusahaan_client ? " dari {$event->client->perusahaan_client}" : '';
        $tgl   = $event->tgl_mulai_event
            ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
            : '-';
        $jam   = $event->jam_mulai ? ', ' . substr((string) $event->jam_mulai, 0, 5) . ' WIB' : '';
        $total = 'Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.');

        $pesan  = "Halo Bapak/Ibu {$nama}{$pt},\n\n";
        $pesan .= "Terima kasih atas ketertarikan Anda bekerja sama dengan *PT Laksamana Muda Bersatu*. "
                . "Berikut kami sampaikan penawaran untuk acara Anda:\n\n";
        $pesan .= "📌 *{$event->nama_event}*\n";
        $pesan .= "🗓️ {$tgl}{$jam}\n";
        if ($event->area_event) { $pesan .= "📍 {$event->area_event}\n"; }
        if ($event->jumlah_pax) { $pesan .= "👥 {$event->jumlah_pax} tamu\n"; }
        $pesan .= "💰 Total penawaran: *{$total}*\n\n";
        $pesan .= "Rincian lengkap kami lampirkan dalam berkas *PDF penawaran* pada pesan ini. Silakan ditinjau; "
                . "bila berkenan, Anda dapat menerima atau menolak penawaran melalui portal klien kami.\n\n";
        $pesan .= "Pembayaran dua tahap: *DP 50%* setelah penawaran disetujui, dan *pelunasan 50%* paling lambat "
                . "sebelum hari-H acara. Penawaran ini berlaku 14 hari sejak tanggal terbit.\n\n";
        $pesan .= "Kami tunggu kabar baiknya. 🙏\n";
        $pesan .= "— PT Laksamana Muda Bersatu";

        return $pesan;
    }

    /** Unduh dokumen penawaran (PDF) untuk dikirim ke klien. */
    protected function unduhPenawaran($id_event)
    {
        $event = Event::eksternal()->with('client')->findOrFail($id_event);

        $kurang = $this->kelengkapanEvent($event);
        if ($kurang) {
            return back()->with('error', 'Penawaran belum bisa dibuat. Lengkapi dulu: ' . implode(', ', $kurang) . '.');
        }

        $pdf = Pdf::loadView('pdf.penawaran', [
            'event'    => $event,
            'nomor'    => 'PNW/' . now()->format('Y/m') . '/' . str_pad((string) $event->id_event, 4, '0', STR_PAD_LEFT),
            'tanggal'  => now()->translatedFormat('d F Y'),
            'tglAcara' => Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y'),
            'jam'      => substr((string) $event->jam_mulai, 0, 5) . ' – ' . substr((string) $event->jam_selesai, 0, 5) . ' WIB',
        ]);

        $namaFile = 'Penawaran-' . Str::slug($event->nama_event) . '.pdf';

        return $pdf->download($namaFile);
    }

    /**
     * Field yang wajib terisi sebelum event boleh naik ke Negotiation/Deal.
     * Ini mewakili "informasi hasil meeting sudah lengkap".
     */
    protected function kelengkapanEvent(Event $event): array
    {
        return $event->kelengkapan();
    }

    /** Pindahkan event antar kolom pipeline (dipakai saat kartu digeser). */
    protected function handlePipelineUpdate(Request $request, $id_event)
    {
        $request->validate([
            'status_event' => ['required', Rule::in(Event::PIPELINE_STATUSES)],
        ]);

        // Kartu yang boleh digeser sama persis dengan yang tampil di papan —
        // definisinya di Event::scopeProspekAktif().
        $event = Event::prospekAktif()->findOrFail($id_event);

        $baru       = $request->status_event;
        $dariRencana = $event->status_event === Event::STATUS_PLANNING;

        // Penawaran yang sudah diterima klien tidak boleh ditarik mundur.
        // Menariknya kembali ke Negotiation memunculkan lagi tombol terima di
        // portal klien, sehingga klien diminta menyetujui penawaran yang sama
        // dua kali dan langkahnya berputar. Pembatalan yang sah lewat "Tidak jadi".
        $urut     = array_flip(Event::PIPELINE_STATUSES);
        $sekarang = $urut[$event->status_event] ?? -1;
        $tujuan   = $urut[$baru] ?? -1;

        if ($tujuan < $sekarang && $event->respon_klien === 'Diterima') {
            throw ValidationException::withMessages([
                'status_event' => 'Penawaran sudah diterima klien, jadi tahapnya tidak bisa dimundurkan. '
                    . 'Bila acaranya memang batal, gunakan tombol "Tidak jadi".',
            ]);
        }

        // Negotiation & Deal hanya boleh bila detail acara sudah lengkap.
        if (in_array($baru, [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL], true)) {
            $kurang = $this->kelengkapanEvent($event);
            if ($kurang) {
                throw ValidationException::withMessages([
                    'status_event' => 'Lengkapi detail event terlebih dahulu: ' . implode(', ', $kurang) . '.',
                ]);
            }
        }

        $ubah = ['status_event' => $baru];

        // Rencana yang mulai digarap sebagai prospek resmi menjadi event klien,
        // supaya masuk hitungan Finance & alur penawaran seperti prospek lain.
        if ($dariRencana) {
            $ubah['tipe_event'] = Event::TIPE_EKSTERNAL;
        }

        $event->update($ubah);

        // Naik ke Negotiation = penawaran resmi dikirimkan. Email + lampiran PDF
        // penawaran dan notifikasi in-app dikirim sekali saat MAJU ke tahap ini
        // (bukan saat kartu ditarik mundur dari Deal ke Negotiation).
        $pesanExtra = '';
        if ($baru === Event::STATUS_NEGOTIATION && $sekarang < $tujuan) {
            $terkirim = $this->kirimPenawaranKeKlien($event);
            $pesanExtra = $terkirim
                ? ' Penawaran beserta dokumen PDF telah dikirim ke email klien.'
                : ' Klien belum memiliki email — silakan kirim penawaran secara manual.';
        }

        // Deal tercapai → appointment asal (bila ada) otomatis ditandai Selesai,
        // sehingga tidak ikut terbatalkan scheduler auto-batal appointment;
        // sekaligus invoice DP diterbitkan otomatis agar Finance tak perlu manual.
        if ($baru === Event::STATUS_DEAL) {
            \App\Models\Appointment::where('id_event', $event->id_event)
                ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
                ->update(['status' => 'Selesai']);

            \App\Models\Invoice::terbitkanDpOtomatis($event->refresh());
        }

        return back()->with('success', "Event \"{$event->nama_event}\" dipindahkan ke tahap {$baru}.{$pesanExtra}");
    }

    /**
     * Kirim penawaran ke klien: email berisi ringkasan + lampiran PDF penawaran,
     * dan notifikasi in-app. Mengembalikan true bila email berhasil dikirim.
     * Kegagalan email/notif hanya dicatat ke log — tidak menggagalkan perpindahan
     * tahap, sebab kartu sudah terlanjur pindah dan datanya tetap benar.
     */
    protected function kirimPenawaranKeKlien(Event $event): bool
    {
        $event->loadMissing('client');

        $terkirim = false;
        $email    = $event->client?->email_client;

        if ($email) {
            try {
                \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\PenawaranDikirim($event));
                $terkirim = true;
            } catch (\Throwable $e) {
                \Log::warning('Email penawaran gagal dikirim: ' . $e->getMessage());
            }
        }

        // Notifikasi in-app untuk klien yang memiliki akun portal.
        if ($event->id_client) {
            try {
                \App\Models\Notifikasi::create([
                    'judul'        => '📩 Penawaran Baru',
                    'pesan'        => "Tim kami mengirimkan penawaran untuk acara \"{$event->nama_event}\". "
                        . 'Tinjau rincian & harga, lalu terima atau tolak melalui dashboard Anda.',
                    'tipe'         => 'penawaran',
                    'reference_id' => $event->id_event,
                    'client_id'    => $event->id_client,
                    'is_read'      => false,
                ]);
            } catch (\Throwable $e) {
                \Log::warning('Notifikasi penawaran gagal dibuat: ' . $e->getMessage());
            }
        }

        return $terkirim;
    }

    /**
     * Tandai prospek "tidak jadi" (batal) langsung dari papan. Berlaku untuk
     * Lead, Negotiation, dan Deal — selama BELUM ada pembayaran masuk. Deal yang
     * sudah menerima uang harus lewat alur Pembatalan & Refund (klien → Manajemen
     * → Finance), bukan sekadar "tidak jadi" di papan ini.
     *
     * Event tidak dihapus permanen: statusnya jadi Batal agar riwayat tetap ada.
     * Invoice yang belum dibayar (mis. DP yang terbit otomatis saat Deal)
     * dibersihkan supaya tidak menggantung.
     */
    protected function handlePipelineBatal(Request $request, $id_event)
    {
        $data = $request->validate([
            'alasan' => ['nullable', 'string', 'max:500'],
        ]);

        $event = Event::eksternal()
            ->whereIn('status_event', [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION, Event::STATUS_DEAL])
            ->findOrFail($id_event);

        // Deal yang sudah ada uang masuk tidak boleh dibatalkan lewat sini.
        if ($event->status_event === Event::STATUS_DEAL) {
            $adaBayar = \App\Models\Transaksi::where('id_event', $event->id_event)->where('nominal', '>', 0)->exists();
            if ($adaBayar) {
                throw ValidationException::withMessages([
                    'alasan' => 'Acara ini sudah menerima pembayaran. Gunakan alur Pembatalan & Refund, bukan "Tidak jadi".',
                ]);
            }
        }

        $jejak = 'Tidak jadi (' . now()->translatedFormat('d M Y') . ')'
            . (filled($data['alasan'] ?? null) ? ': ' . trim($data['alasan']) : '.');

        // Bersihkan invoice yang belum dibayar (mis. DP otomatis saat Deal).
        \App\Models\Invoice::where('id_event', $event->id_event)
            ->where('status', \App\Models\Invoice::STATUS_BELUM)
            ->delete();

        $event->update([
            'status_event' => Event::STATUS_BATAL,
            'note_event'   => $event->note_event
                ? $event->note_event . ' | ' . $jejak
                : $jejak,
        ]);

        return back()->with('success', "Prospek \"{$event->nama_event}\" ditandai tidak jadi.");
    }
}
