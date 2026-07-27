<?php

namespace App\Traits;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Persetujuan penawaran oleh Pihak Manajemen sebelum dikirimkan ke klien.
 *
 * Sebelumnya penawaran langsung terkirim begitu prospek digeser ke tahap
 * Negotiation, sehingga harga yang belum ditinjau bisa terlanjur sampai ke
 * klien. Kini Event Marketing mengajukannya, Manajemen memutuskan, dan
 * pengiriman email beserta dokumen penawaran terjadi pada saat disetujui.
 *
 * Penolakan tidak menurunkan tahap acara — kartunya tetap di Negotiation dengan
 * catatan perbaikan, supaya Event Marketing bisa membetulkan lalu mengajukannya
 * kembali tanpa kehilangan riwayat.
 */
trait ManagesPersetujuanPenawaran
{
    use KabariRole;

    /** Ambil acara yang penawarannya benar-benar sedang menunggu keputusan. */
    private function penawaranMenunggu($id_event): Event
    {
        $event = Event::eksternal()->with('client')->findOrFail($id_event);

        if ($event->penawaran_status !== Event::PENAWARAN_DIAJUKAN) {
            throw ValidationException::withMessages([
                'penawaran' => 'Penawaran ini tidak sedang menunggu persetujuan (status: '
                    . ($event->penawaran_status ?? 'belum diajukan') . ').',
            ]);
        }

        return $event;
    }

    /** Manajemen menyetujui → penawaran dikirimkan ke klien saat ini juga. */
    protected function setujuiPenawaran($id_event)
    {
        $event = $this->penawaranMenunggu($id_event);

        // Data acara diperiksa ulang di sini, bukan hanya saat kartu digeser:
        // detailnya bisa berubah antara pengajuan dan persetujuan.
        $kurang = $event->kelengkapan();
        if ($kurang) {
            throw ValidationException::withMessages([
                'penawaran' => 'Penawaran belum bisa disetujui. Lengkapi dulu: ' . implode(', ', $kurang) . '.',
            ]);
        }

        $event->update([
            'penawaran_status'        => Event::PENAWARAN_DISETUJUI,
            'penawaran_ditinjau_oleh' => Auth::guard('pegawai')->id(),
            'penawaran_ditinjau_pada' => now(),
            'penawaran_catatan'       => null,
        ]);

        $this->jejakPenawaran($event, '✅ Penawaran disetujui Manajemen');

        $terkirim = $this->kirimPenawaranKeKlien($event);

        return back()->with('success', $terkirim
            ? "Penawaran \"{$event->nama_event}\" disetujui dan telah dikirim ke email klien."
            : "Penawaran \"{$event->nama_event}\" disetujui. Klien belum memiliki email — silakan kirim secara manual.");
    }

    /** Manajemen menolak → Event Marketing memperbaiki lalu mengajukan ulang. */
    protected function tolakPenawaranManajemen(Request $request, $id_event)
    {
        $data = $request->validate([
            'catatan' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'catatan.required' => 'Sertakan catatan agar Event Marketing tahu apa yang perlu diperbaiki.',
        ]);

        $event = $this->penawaranMenunggu($id_event);

        $event->update([
            'penawaran_status'        => Event::PENAWARAN_DITOLAK,
            'penawaran_ditinjau_oleh' => Auth::guard('pegawai')->id(),
            'penawaran_ditinjau_pada' => now(),
            'penawaran_catatan'       => trim($data['catatan']),
        ]);

        $this->jejakPenawaran($event, '❌ Penawaran ditolak Manajemen: ' . trim($data['catatan']));

        $this->kabariRole('EventMarketing',
            '❌ Penawaran perlu diperbaiki — ' . $event->nama_event,
            "Penawaran untuk acara \"{$event->nama_event}\" belum disetujui Pihak Manajemen.\n\n"
            . "Catatan: " . trim($data['catatan']) . "\n\n"
            . 'Silakan perbaiki detail acara atau harganya, lalu ajukan kembali dari papan Pipeline.');

        return back()->with('success', 'Penawaran ditolak. Event Marketing telah diberi tahu.');
    }

    /**
     * Event Marketing mengajukan ulang setelah memperbaiki. Berlaku untuk
     * penawaran yang ditolak maupun yang belum pernah diajukan — mis. acara yang
     * sudah berada di Negotiation sebelum aturan persetujuan ini berlaku.
     */
    protected function ajukanUlangPenawaran($id_event)
    {
        $event = Event::eksternal()
            ->whereIn('status_event', [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL])
            ->findOrFail($id_event);

        if ($event->penawaranDisetujui()) {
            throw ValidationException::withMessages([
                'penawaran' => 'Penawaran ini sudah disetujui dan terkirim ke klien.',
            ]);
        }

        if ($event->penawaran_status === Event::PENAWARAN_DIAJUKAN) {
            throw ValidationException::withMessages([
                'penawaran' => 'Penawaran ini sudah diajukan dan sedang menunggu keputusan Manajemen.',
            ]);
        }

        $kurang = $event->kelengkapan();
        if ($kurang) {
            throw ValidationException::withMessages([
                'penawaran' => 'Lengkapi detail acara dulu: ' . implode(', ', $kurang) . '.',
            ]);
        }

        $event->update([
            'penawaran_status'        => Event::PENAWARAN_DIAJUKAN,
            'penawaran_diajukan_oleh' => Auth::guard('pegawai')->id(),
            'penawaran_diajukan_pada' => now(),
            'penawaran_catatan'       => null,
        ]);

        $this->jejakPenawaran($event, '📝 Penawaran diajukan ulang ke Manajemen');

        $this->kabariRole('Manajemen',
            '📝 Penawaran menunggu persetujuan — ' . $event->nama_event,
            "Penawaran untuk acara \"{$event->nama_event}\" diajukan kembali setelah diperbaiki.\n\n"
            . 'Nilai penawaran: Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.') . ".\n\n"
            . 'Silakan tinjau di papan Pipeline.');

        return back()->with('success', 'Penawaran diajukan ke Manajemen. Akan dikirim ke klien setelah disetujui.');
    }

    private function jejakPenawaran(Event $event, string $teks): void
    {
        $jejak = $teks . ' (' . now()->translatedFormat('d M Y H:i') . ')';
        $event->update([
            'note_event' => $event->note_event ? $event->note_event . ' | ' . $jejak : $jejak,
        ]);
    }
}
