<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\EventPembatalan;
use App\Models\Notifikasi;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Alur persetujuan pembatalan + refund BERURUTAN tiga pihak:
 *   Klien ajukan → Event Marketing setuju → Finance setuju (tetapkan nominal)
 *   → Manajemen setuju terakhir (refund diproses, acara jadi Batal).
 * Dipakai bersama controller EM, Finance, & Manajemen agar satu sumber logika.
 */
trait ManagesPembatalan
{
    use KabariRole;

    /** Halaman daftar pengajuan — komponen sama, tombol menyesuaikan peran. */
    protected function daftarPembatalan(string $komponen, array $routes, string $peran)
    {
        $pengajuan = EventPembatalan::with([
                'event:id_event,nama_event,tgl_mulai_event,status_event,deal_harga_event',
                'event.client:id,nama_client,perusahaan_client',
                'event.transaksis:id_transaksi,id_event,nominal',
                'penyetujuEm:id_pegawai,nama_pegawai',
                'penyetujuFinance:id_pegawai,nama_pegawai',
                'penyetujuManajemen:id_pegawai,nama_pegawai',
            ])
            ->latest()
            ->get()
            ->map(function (EventPembatalan $p) {
                $p->refund_estimasi = (float) ($p->event?->transaksis?->sum('nominal') ?? 0);
                $p->giliran = EventPembatalan::giliran($p->status);
                unset($p->event->transaksis);
                return $p;
            });

        return Inertia::render($komponen, [
            'pengajuan' => $pengajuan,
            'peran'     => $peran,
            'routes'    => $routes,
        ]);
    }

    /** Event Marketing menyetujui (tahap 1) → lanjut ke Finance. */
    protected function accEM($id)
    {
        $p = EventPembatalan::with('event')->where('status', EventPembatalan::STATUS_DIAJUKAN)->findOrFail($id);

        $p->update([
            'status'  => EventPembatalan::STATUS_DISETUJUI_EM,
            'em_oleh' => Auth::guard('pegawai')->id(),
            'em_pada' => now(),
        ]);

        $this->jejakPembatalan($p, '✅ Disetujui Event Marketing');
        $this->kabariRole('Finance', '💸 Pembatalan menunggu penetapan refund — ' . ($p->event?->nama_event ?? '-'),
            "Pengajuan pembatalan acara \"{$p->event?->nama_event}\" telah disetujui Event Marketing.\n\n"
            . "Silakan tinjau di menu Pembatalan: setujui sekaligus tetapkan nominal refund, atau tolak.");

        return back()->with('success', 'Pengajuan disetujui. Diteruskan ke Finance.');
    }

    /** Finance menyetujui + menetapkan nominal refund (tahap 2) → lanjut ke Manajemen. */
    protected function accFinance(Request $request, $id)
    {
        $p = EventPembatalan::with('event')->where('status', EventPembatalan::STATUS_DISETUJUI_EM)->findOrFail($id);

        $dibayar = (float) Transaksi::where('id_event', $p->id_event)->sum('nominal');

        $data = $request->validate([
            'refund_nominal' => ['required', 'numeric', 'min:0', 'max:' . $dibayar],
        ], [
            'refund_nominal.max' => 'Nominal refund tidak boleh melebihi total dibayar (Rp ' . number_format($dibayar, 0, ',', '.') . ').',
        ]);

        $p->update([
            'status'         => EventPembatalan::STATUS_DISETUJUI_FIN,
            'finance_oleh'   => Auth::guard('pegawai')->id(),
            'finance_pada'   => now(),
            'refund_nominal' => (float) $data['refund_nominal'],
        ]);

        $this->jejakPembatalan($p, '✅ Disetujui Finance — refund Rp ' . number_format((float) $data['refund_nominal'], 0, ',', '.'));
        $this->kabariRole('Manajemen', '🖊️ Pembatalan menunggu persetujuan akhir — ' . ($p->event?->nama_event ?? '-'),
            "Pengajuan pembatalan acara \"{$p->event?->nama_event}\" telah disetujui Event Marketing & Finance.\n\n"
            . 'Nominal refund yang ditetapkan Finance: Rp ' . number_format((float) $data['refund_nominal'], 0, ',', '.') . ".\n\n"
            . 'Silakan beri persetujuan akhir di menu Pembatalan; refund akan diproses setelah Anda menyetujui.');

        return back()->with('success', 'Pengajuan disetujui & nominal refund ditetapkan. Diteruskan ke Manajemen.');
    }

    /** Manajemen menyetujui terakhir (tahap 3) → refund diproses, acara Batal. */
    protected function accManajemen($id)
    {
        $p = EventPembatalan::with('event')->where('status', EventPembatalan::STATUS_DISETUJUI_FIN)->findOrFail($id);

        $event  = $p->event;
        $refund = (float) $p->refund_nominal;

        if (! $event) {
            return back()->with('error', 'Acara untuk pengajuan ini tidak ditemukan.');
        }

        DB::transaction(function () use ($event, $p, $refund) {
            if ($refund > 0) {
                Transaksi::create([
                    'id_event'   => $event->id_event,
                    'id_pegawai' => Auth::guard('pegawai')->id(),
                    'nominal'    => -1 * $refund,
                    'tgl_bayar'  => now()->toDateString(),
                    'keterangan' => 'Refund pembatalan acara — ' . trim($p->alasan),
                ]);
            }

            $jejak = '💸 Disetujui Manajemen & refund diproses (' . now()->translatedFormat('d M Y H:i') . ')'
                . ($refund > 0 ? ' — Rp ' . number_format($refund, 0, ',', '.') : ' — tanpa pengembalian dana') . '. Acara dibatalkan.';
            $event->update([
                'status_event' => Event::STATUS_BATAL,
                'note_event'   => $event->note_event ? $event->note_event . ' | ' . $jejak : $jejak,
            ]);

            $p->update([
                'status'         => EventPembatalan::STATUS_SELESAI,
                'manajemen_oleh' => Auth::guard('pegawai')->id(),
                'manajemen_pada' => now(),
                'diproses_pada'  => now(),
            ]);
        });

        if ($p->client_id) {
            Notifikasi::create([
                'judul'        => 'Pembatalan Disetujui',
                'pesan'        => "Acara \"{$event->nama_event}\" telah dibatalkan."
                    . ($refund > 0 ? ' Pengembalian dana Rp ' . number_format($refund, 0, ',', '.') . ' sedang kami proses.' : ''),
                'tipe'         => 'pembatalan',
                'reference_id' => $event->id_event,
                'client_id'    => $p->client_id,
                'is_read'      => false,
            ]);
        }

        $pesan = $refund > 0
            ? 'Disetujui. Refund Rp ' . number_format($refund, 0, ',', '.') . ' dicatat & acara dibatalkan.'
            : 'Disetujui. Acara dibatalkan tanpa pengembalian dana.';

        return back()->with('success', $pesan);
    }

    /** Tolak pengajuan di tahap mana pun (menghentikan alur), klien diberi tahu. */
    protected function tolakPembatalan(Request $request, $id, string $peran)
    {
        $data = $request->validate([
            'catatan' => 'required|string|min:5|max:500',
        ], ['catatan.required' => 'Sertakan alasan penolakan agar klien mengerti.']);

        $p = EventPembatalan::with('event')->aktif()->findOrFail($id);

        $p->update([
            'status'        => EventPembatalan::STATUS_DITOLAK,
            'catatan_tolak' => $data['catatan'],
            'ditolak_peran' => $peran,
        ]);

        $this->jejakPembatalan($p, "❌ Ditolak {$peran}: " . trim($data['catatan']));

        if ($p->client_id) {
            Notifikasi::create([
                'judul'        => 'Pengajuan Pembatalan Ditolak',
                'pesan'        => "Pengajuan pembatalan acara \"{$p->event?->nama_event}\" belum dapat disetujui. Alasan: " . trim($data['catatan']),
                'tipe'         => 'pembatalan',
                'reference_id' => $p->id_event,
                'client_id'    => $p->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Pengajuan ditolak. Klien telah diberi tahu.');
    }

    private function jejakPembatalan(EventPembatalan $p, string $teks): void
    {
        if (! $p->event) {
            return;
        }
        $jejak = $teks . ' (' . now()->translatedFormat('d M Y H:i') . ')';
        $p->event->update([
            'note_event' => $p->event->note_event ? $p->event->note_event . ' | ' . $jejak : $jejak,
        ]);
    }
}
