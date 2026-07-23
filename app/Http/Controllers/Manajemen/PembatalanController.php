<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\EventPembatalan;
use App\Models\Notifikasi;
use App\Traits\ChecksPegawaiRole;
use App\Traits\KabariRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Manajemen meninjau pengajuan pembatalan dari klien: menyetujui (lanjut ke
 * Finance untuk refund) atau menolak (klien diberi tahu). Manajemen tidak
 * menyentuh uang — pemrosesan refund tetap di Finance.
 */
class PembatalanController extends Controller
{
    use ChecksPegawaiRole;
    use KabariRole;

    public function index()
    {
        $this->checkManajemen();

        $pengajuan = EventPembatalan::with([
                'event:id_event,nama_event,tgl_mulai_event,status_event,deal_harga_event',
                'event.client:id,nama_client,perusahaan_client',
                'event.transaksis:id_transaksi,id_event,nominal',
                'penyetuju:id_pegawai,nama_pegawai',
            ])
            ->latest()
            ->get()
            ->map(function (EventPembatalan $p) {
                // Perkiraan refund = uang yang sudah masuk untuk acara ini.
                $p->refund_estimasi = (float) ($p->event?->transaksis?->sum('nominal') ?? 0);
                unset($p->event->transaksis); // tak perlu dikirim mentah ke klien
                return $p;
            });

        return Inertia::render('Manajemen/Pembatalan/Index', [
            'pengajuan' => $pengajuan,
            'counts'    => [
                'diajukan'  => EventPembatalan::where('status', EventPembatalan::STATUS_DIAJUKAN)->count(),
                'disetujui' => EventPembatalan::where('status', EventPembatalan::STATUS_DISETUJUI)->count(),
            ],
        ]);
    }

    public function setujui(Request $request, $id)
    {
        $this->checkManajemen();

        $data = $request->validate(['catatan' => 'nullable|string|max:1000']);

        $p = EventPembatalan::with('event')
            ->where('status', EventPembatalan::STATUS_DIAJUKAN)
            ->findOrFail($id);

        $p->update([
            'status'            => EventPembatalan::STATUS_DISETUJUI,
            'catatan_manajemen' => $data['catatan'] ?? null,
            'disetujui_oleh'    => Auth::guard('pegawai')->id(),
            'disetujui_pada'    => now(),
        ]);

        $namaEvent = $p->event?->nama_event ?? '-';
        if ($p->event) {
            $jejak = '✅ Pembatalan DISETUJUI Manajemen (' . now()->translatedFormat('d M Y H:i') . ')'
                . (! empty($data['catatan']) ? ': ' . trim($data['catatan']) : '.');
            $p->event->update(['note_event' => $p->event->note_event ? $p->event->note_event . ' | ' . $jejak : $jejak]);
        }

        $this->kabariRole('Finance',
            '✅ Pembatalan Disetujui — ' . $namaEvent,
            "Pengajuan pembatalan acara \"{$namaEvent}\" telah DISETUJUI Manajemen.\n\n"
            . "Silakan proses pengembalian dana (refund) di menu Invoice — tombol \"Proses Refund\"."
        );

        return back()->with('success', 'Pengajuan disetujui. Finance akan memproses refund.');
    }

    public function tolak(Request $request, $id)
    {
        $this->checkManajemen();

        $data = $request->validate([
            'catatan' => 'required|string|min:5|max:1000',
        ], [
            'catatan.required' => 'Sertakan alasan penolakan agar klien mengerti.',
        ]);

        $p = EventPembatalan::with('event')
            ->where('status', EventPembatalan::STATUS_DIAJUKAN)
            ->findOrFail($id);

        $p->update([
            'status'            => EventPembatalan::STATUS_DITOLAK,
            'catatan_manajemen' => $data['catatan'],
            'disetujui_oleh'    => Auth::guard('pegawai')->id(),
            'disetujui_pada'    => now(),
        ]);

        $namaEvent = $p->event?->nama_event ?? '-';
        if ($p->event) {
            $jejak = '❌ Pembatalan DITOLAK Manajemen (' . now()->translatedFormat('d M Y H:i') . '): ' . trim($data['catatan']);
            $p->event->update(['note_event' => $p->event->note_event ? $p->event->note_event . ' | ' . $jejak : $jejak]);
        }

        // Klien diberi tahu lewat notifikasi in-app (tabel Notifikasi = milik klien).
        if ($p->client_id) {
            Notifikasi::create([
                'judul'        => 'Pengajuan Pembatalan Ditolak',
                'pesan'        => "Pengajuan pembatalan acara \"{$namaEvent}\" belum dapat disetujui. Alasan: " . trim($data['catatan']),
                'tipe'         => 'pembatalan',
                'reference_id' => $p->id_event,
                'client_id'    => $p->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Pengajuan ditolak. Klien telah diberi tahu.');
    }
}
