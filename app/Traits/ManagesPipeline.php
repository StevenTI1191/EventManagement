<?php

namespace App\Traits;

use App\Models\Event;
use App\Support\Wa;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
    // Pengajuan penawaran mengabari Manajemen lewat email.
    use KabariRole;

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
                . "*H-3 sebelum acara* (tiga hari sebelum hari pelaksanaan). "
                . "Penawaran ini berlaku 14 hari sejak tanggal terbit.\n\n";
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

        // Deal adalah kesepakatan yang sudah berjalan: invoice uang muka terbit
        // dan tagihannya jalan. Menariknya kembali membuat tagihan itu
        // menggantung pada acara yang tahapnya seolah belum disepakati. Jalan
        // keluar yang sah hanya "Tidak jadi".
        //
        // Penjagaan ini sengaja TIDAK bersandar pada respon_klien seperti
        // penjagaan di bawahnya: mengajukan penawaran revisi mengosongkan
        // respon_klien, sehingga acara yang sudah Deal sempat bisa ditarik
        // mundur selama revisinya menunggu keputusan Manajemen.
        if ($event->status_event === Event::STATUS_DEAL && $tujuan < $sekarang) {
            throw ValidationException::withMessages([
                'status_event' => 'Acara yang sudah Deal tidak dapat dikembalikan ke tahap sebelumnya. '
                    . 'Bila acaranya memang batal, gunakan tombol "Tidak jadi".',
            ]);
        }

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

        // Deal berarti kesepakatan, dan kesepakatan hanya sah bila klien memang
        // sudah menyetujui penawarannya. Tanpa penjagaan ini kartu bisa digeser
        // ke Deal sepihak — invoice uang muka terbit dan tagihan berjalan untuk
        // penawaran yang belum pernah diterima siapa pun.
        if ($baru === Event::STATUS_DEAL) {
            if (! $event->penawaranDisetujui()) {
                throw ValidationException::withMessages([
                    'status_event' => 'Penawarannya belum disetujui Pihak Manajemen, jadi belum pernah sampai ke klien.',
                ]);
            }

            if ($event->respon_klien !== 'Diterima') {
                throw ValidationException::withMessages([
                    'status_event' => $event->respon_klien === 'Ditolak'
                        ? 'Klien menolak penawaran ini. Ajukan penawaran revisi lebih dulu.'
                        : 'Klien belum menerima penawarannya. Tahap Deal baru dapat ditetapkan setelah klien menyetujui.',
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

        // Naik ke Negotiation = penawaran DIAJUKAN, bukan langsung dikirim.
        // Penawaran wajib disetujui Pihak Manajemen lebih dulu; pengirimannya ke
        // klien terjadi pada saat persetujuan itu (lihat ManagesPersetujuanPenawaran).
        // Penawaran yang sudah disetujui tidak diajukan ulang saat kartu bergerak.
        $pesanExtra = '';
        if ($baru === Event::STATUS_NEGOTIATION && $sekarang < $tujuan
            && ! $event->penawaranDisetujui()) {
            $event->update([
                'penawaran_status'        => Event::PENAWARAN_DIAJUKAN,
                'penawaran_diajukan_oleh' => Auth::guard('pegawai')->id(),
                'penawaran_diajukan_pada' => now(),
                'penawaran_catatan'       => null,
            ]);

            $this->kabariRole('Manajemen',
                '📝 Penawaran menunggu persetujuan — ' . $event->nama_event,
                "Penawaran untuk acara \"{$event->nama_event}\" telah disiapkan dan menunggu persetujuan Anda.\n\n"
                . 'Nilai penawaran: Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.') . ".\n\n"
                . 'Silakan tinjau di papan Pipeline. Penawaran baru dikirimkan ke klien setelah Anda menyetujuinya.');

            $pesanExtra = ' Penawaran diajukan ke Manajemen — akan dikirim ke klien setelah disetujui.';
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
     * Lead, Negotiation, dan Deal — selama BELUM ada pembayaran masuk.
     *
     * Acara yang sudah menerima uang tidak boleh dibatalkan sepihak dari sini:
     * keputusannya ada pada klien. Ia membatalkan sendiri dari portalnya dengan
     * akibat uang mukanya hangus, atau mengajukan penggantian tanggal agar uang
     * mukanya tetap berlaku. Alur persetujuan berjenjang beserta refund sudah
     * tidak ada lagi.
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
                    'alasan' => 'Acara ini sudah menerima pembayaran, jadi tidak dapat ditandai "Tidak jadi". '
                        . 'Pembatalannya hanya dapat dilakukan klien sendiri dari portalnya — uang mukanya hangus — '
                        . 'atau klien mengajukan penggantian tanggal agar uang mukanya tetap berlaku.',
                ]);
            }
        }

        $jejak = 'Prospek ditandai tidak jadi'
            . (filled($data['alasan'] ?? null) ? ': ' . trim($data['alasan']) : '.');

        // Bersihkan invoice yang belum dibayar (mis. DP otomatis saat Deal).
        \App\Models\Invoice::where('id_event', $event->id_event)
            ->where('status', \App\Models\Invoice::STATUS_BELUM)
            ->delete();

        // Permintaan ganti tanggal yang masih menunggu ikut ditutup. Prospek
        // yang sudah Deal boleh mengajukannya, dan penandaan "tidak jadi" di
        // sini berlaku sampai tahap Deal — jadi keadaan ini benar-benar dapat
        // terjadi. Tanpa penutupan, pengajuannya menggantung selamanya sebagai
        // "menunggu persetujuan" di dashboard klien, dan Manajemen hanya dapat
        // membereskannya dengan menolaknya satu per satu.
        //
        // Penutupan yang sama sudah dilakukan pada pembatalan oleh klien;
        // jalur ini yang terlewat.
        \App\Models\EventReschedule::where('id_event', $event->id_event)
            ->where('status', \App\Models\EventReschedule::STATUS_DIAJUKAN)
            ->update([
                'status'        => \App\Models\EventReschedule::STATUS_DITOLAK,
                'catatan_tolak' => 'Prospek ditandai tidak jadi sebelum permintaan ini ditinjau.',
            ]);

        $event->update([
            'status_event' => Event::STATUS_BATAL,
            // Penawaran yang masih menunggu keputusan ikut ditutup. Tanpa ini,
            // prospek yang sudah tidak jadi tetap mengendap di antrean
            // persetujuan Manajemen — ikut terhitung badge, dan bila disetujui
            // penawarannya benar-benar terkirim ke klien.
            'penawaran_status'  => null,
            'penawaran_catatan' => null,
        ]);

        // Pembahasan penawaran yang masih berjalan ikut ditutup beserta slot
        // pertemuannya — antrean turunan yang sama seperti invoice di atas.
        $ditutup = \App\Models\EventNegosiasi::tutupUntukEvent(
            $event->id_event, 'Prospek ditandai tidak jadi, pembahasan dihentikan.');

        if ($ditutup) {
            $jejak .= ' ' . $ditutup . ' pembahasan penawaran ikut ditutup.';
        }

        $event->catatJejak($jejak);

        return back()->with('success', "Prospek \"{$event->nama_event}\" ditandai tidak jadi.");
    }
}
