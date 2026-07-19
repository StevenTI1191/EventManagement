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
            ->orderByDesc('updated_at')
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
        $sapaan = $event->client->nama_client ?? 'Bapak/Ibu';
        $tgl    = $event->tgl_mulai_event
            ? Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
            : '-';
        $total  = 'Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.');

        return "Halo {$sapaan}, berikut kami kirimkan penawaran untuk acara \"{$event->nama_event}\" "
            . "pada {$tgl}. Total penawaran {$total}. File penawaran kami lampirkan pada pesan ini. "
            . "Mohon dicek, terima kasih. — PT Laksamana Muda Bersatu";
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

        // Kartu yang boleh digeser: prospek eksternal di pipeline, ATAU rencana
        // (Planning) yang sudah menyasar klien tertentu.
        $event = Event::where(function ($q) {
            $q->where(function ($e) {
                $e->where('tipe_event', Event::TIPE_EKSTERNAL)
                  ->whereIn('status_event', Event::PIPELINE_STATUSES);
            })->orWhere(function ($p) {
                $p->where('tipe_event', Event::TIPE_INTERNAL)
                  ->where('status_event', Event::STATUS_PLANNING)
                  ->whereNotNull('id_client');
            });
        })->findOrFail($id_event);

        $baru       = $request->status_event;
        $dariRencana = $event->status_event === Event::STATUS_PLANNING;

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

        // Deal tercapai → appointment asal (bila ada) otomatis ditandai Selesai,
        // sehingga tidak ikut terbatalkan scheduler auto-batal appointment.
        if ($baru === Event::STATUS_DEAL) {
            \App\Models\Appointment::where('id_event', $event->id_event)
                ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
                ->update(['status' => 'Selesai']);
        }

        return back()->with('success', "Event \"{$event->nama_event}\" dipindahkan ke tahap {$baru}.");
    }

    /**
     * Tandai prospek "tidak jadi" (batal). Hanya berlaku selama event masih di
     * tahap awal pipeline (Lead/Negotiation) — setelah Deal, event sudah
     * ditangani Finance lewat invoice, sehingga pembatalannya bukan di papan ini.
     *
     * Event tidak dihapus: statusnya jadi Batal agar riwayat tetap ada, dan
     * alasan gagalnya dicatat di note_event untuk bahan evaluasi prospek.
     */
    protected function handlePipelineBatal(Request $request, $id_event)
    {
        $data = $request->validate([
            'alasan' => ['nullable', 'string', 'max:500'],
        ]);

        $event = Event::eksternal()
            ->whereIn('status_event', [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION])
            ->findOrFail($id_event);

        $jejak = 'Tidak jadi (' . now()->translatedFormat('d M Y') . ')'
            . (filled($data['alasan'] ?? null) ? ': ' . trim($data['alasan']) : '.');

        $event->update([
            'status_event' => Event::STATUS_BATAL,
            'note_event'   => $event->note_event
                ? $event->note_event . ' | ' . $jejak
                : $jejak,
        ]);

        return back()->with('success', "Prospek \"{$event->nama_event}\" ditandai tidak jadi.");
    }
}
