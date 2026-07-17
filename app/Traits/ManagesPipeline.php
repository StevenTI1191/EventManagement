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
    /** Event eksternal yang masih berada di papan pipeline, dikelompokkan per status. */
    protected function pipelineColumns(): array
    {
        $events = Event::eksternal()->pipeline()
            ->with([
                'client:id,nama_client,perusahaan_client,no_telp_client,sumber',
                'pic:id_pegawai,nama_pegawai',
            ])
            ->orderByDesc('updated_at')
            ->get();

        // Sisipkan link WhatsApp siap kirim (pesan penawaran) untuk tiap kartu.
        $events->each(function (Event $e) {
            $e->wa_penawaran = Wa::link(
                $e->client->no_telp_client ?? null,
                $this->pesanPenawaran($e),
            );
        });

        $kolom = [];
        foreach (Event::PIPELINE_STATUSES as $status) {
            $kolom[$status] = $events->where('status_event', $status)->values();
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
        $wajib = [
            'tgl_mulai_event'  => 'Tanggal acara',
            'jam_mulai'        => 'Jam mulai',
            'jam_selesai'      => 'Jam selesai',
            'area_event'       => 'Area acara',
            'jumlah_pax'       => 'Jumlah pax',
            'deal_harga_event' => 'Deal harga',
        ];

        $kurang = [];
        foreach ($wajib as $kolom => $label) {
            if (blank($event->{$kolom})) {
                $kurang[] = $label;
            }
        }

        return $kurang;
    }

    /** Pindahkan event antar kolom pipeline (dipakai saat kartu digeser). */
    protected function handlePipelineUpdate(Request $request, $id_event)
    {
        $request->validate([
            'status_event' => ['required', Rule::in(Event::PIPELINE_STATUSES)],
        ]);

        $event = Event::eksternal()->pipeline()->findOrFail($id_event);
        $baru  = $request->status_event;

        // Negotiation & Deal hanya boleh bila detail acara sudah lengkap.
        if (in_array($baru, [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL], true)) {
            $kurang = $this->kelengkapanEvent($event);
            if ($kurang) {
                throw ValidationException::withMessages([
                    'status_event' => 'Lengkapi detail event terlebih dahulu: ' . implode(', ', $kurang) . '.',
                ]);
            }
        }

        $event->update(['status_event' => $baru]);

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
