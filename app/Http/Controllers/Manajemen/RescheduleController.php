<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventPembatalan;
use App\Models\EventReschedule;
use App\Models\Notifikasi;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Pengajuan GANTI TANGGAL acara dari klien, beserta riwayat pembatalan.
 *
 * Pembatalan sendiri tidak lagi ditinjau siapa pun — uang muka hangus dan
 * acaranya langsung batal. Yang tersisa untuk diputuskan hanyalah permintaan
 * memindahkan jadwal, dan itu wewenang Manajemen karena menyangkut ketersediaan
 * venue: tanggal yang diminta bisa saja sudah dipakai acara lain.
 */
class RescheduleController extends Controller
{
    use ChecksPegawaiRole;

    public function index()
    {
        $this->checkManajemen();

        $pengajuan = EventReschedule::with([
                'event:id_event,nama_event,tgl_mulai_event,tgl_selesai_event,jam_mulai,jam_selesai,area_event,status_event,deal_harga_event',
                'event.client:id,nama_client,perusahaan_client,no_telp_client',
                'penyetuju:id_pegawai,nama_pegawai',
            ])
            ->latest()
            ->get();

        $pembatalan = EventPembatalan::with([
                'event:id_event,nama_event,tgl_mulai_event',
                'client:id,nama_client,perusahaan_client',
            ])
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('Manajemen/Reschedule/Index', [
            'pengajuan'  => $pengajuan,
            'pembatalan' => $pembatalan,
        ]);
    }

    /** Setujui pemindahan jadwal — tanggal acara berpindah, uang muka utuh. */
    public function setujui($id)
    {
        $this->checkManajemen();

        $r = EventReschedule::with('event')->findOrFail($id);

        if ($r->status !== EventReschedule::STATUS_DIAJUKAN) {
            return back()->with('error', 'Pengajuan ini sudah diproses sebelumnya.');
        }

        $event = $r->event;
        if (! $event) {
            return back()->with('error', 'Acara untuk pengajuan ini tidak ditemukan.');
        }

        // Acara yang sudah dibatalkan atau ditutup tidak punya jadwal untuk
        // dipindahkan. Tanpa penjagaan ini, pengajuan yang menggantung sejak
        // sebelum acaranya batal masih bisa disetujui dan menggeser tanggalnya.
        if (! in_array($event->status_event, [Event::STATUS_DEAL, Event::STATUS_UPCOMING], true)) {
            return back()->with('error',
                "Acara \"{$event->nama_event}\" berstatus {$event->status_event}, jadwalnya tidak dapat dipindahkan lagi.");
        }

        // Tanggal baru harus benar-benar kosong. Diperiksa DI SINI, bukan hanya
        // saat klien mengajukan — slot bisa terisi acara lain di sela-selanya.
        $bentrok = Event::checkBentrok(
            $r->tgl_baru->toDateString(),
            $event->jam_mulai,
            $event->jam_selesai,
            $event->area_event,
            $event->id_event,
            optional($r->tgl_selesai_baru)->toDateString(),
            $event->loading_in,
            $event->loading_out,
        );

        if ($bentrok) {
            throw ValidationException::withMessages([
                'jadwal' => "Tanggal yang diminta bentrok dengan acara \"{$bentrok->nama_event}\" "
                    . "di area {$bentrok->area_event}. Tolak pengajuan ini dan tawarkan tanggal lain.",
            ]);
        }

        DB::transaction(function () use ($r, $event) {
            $lama = Carbon::parse($r->tgl_lama)->translatedFormat('d M Y');
            $baru = $r->tgl_baru->translatedFormat('d M Y');

            $event->update([
                'tgl_mulai_event'   => $r->tgl_baru->toDateString(),
                'tgl_selesai_event' => optional($r->tgl_selesai_baru)->toDateString(),
            ]);

            $event->catatJejak(
                "Jadwal dipindah dari {$lama} ke {$baru} atas permintaan klien, disetujui Manajemen.");

            $r->update([
                'status'         => EventReschedule::STATUS_DISETUJUI,
                'manajemen_oleh' => Auth::guard('pegawai')->id(),
                'manajemen_pada' => now(),
            ]);

            // Jatuh tempo tagihan yang belum dibayar ikut bergeser mengikuti
            // tanggal acara yang baru. Tanpa ini, acara yang diundur akan
            // ditagih jauh sebelum waktunya dan dianggap menunggak oleh
            // penjadwal pengingat.
            \App\Models\Invoice::selaraskanJatuhTempo($event->refresh());
        });

        if ($r->client_id) {
            Notifikasi::create([
                'judul'        => '📅 Jadwal Acara Dipindahkan',
                'pesan'        => "Permintaan ganti tanggal acara \"{$event->nama_event}\" disetujui. "
                    . 'Jadwal baru: ' . $r->tgl_baru->translatedFormat('d F Y')
                    . '. Uang muka Anda tetap berlaku.',
                'tipe'         => 'reschedule',
                'reference_id' => $event->id_event,
                'client_id'    => $r->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Jadwal acara berhasil dipindahkan. Klien telah diberi tahu.');
    }

    /** Tolak pemindahan jadwal — jadwal semula tetap berlaku. */
    public function tolak(Request $request, $id)
    {
        $this->checkManajemen();

        $data = $request->validate([
            'catatan' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'catatan.required' => 'Sertakan alasan agar klien mengerti.',
        ]);

        $r = EventReschedule::with('event')->findOrFail($id);

        if ($r->status !== EventReschedule::STATUS_DIAJUKAN) {
            return back()->with('error', 'Pengajuan ini sudah diproses sebelumnya.');
        }

        $r->update([
            'status'         => EventReschedule::STATUS_DITOLAK,
            'manajemen_oleh' => Auth::guard('pegawai')->id(),
            'manajemen_pada' => now(),
            'catatan_tolak'  => trim($data['catatan']),
        ]);

        $r->event?->catatJejak(
            'Permintaan ganti tanggal ditolak Manajemen: ' . trim($data['catatan']));

        if ($r->client_id) {
            Notifikasi::create([
                'judul'        => 'Permintaan Ganti Tanggal Belum Disetujui',
                'pesan'        => "Permintaan ganti tanggal acara \"{$r->event?->nama_event}\" belum dapat kami penuhi. "
                    . 'Alasan: ' . trim($data['catatan']) . '. Jadwal semula tetap berlaku.',
                'tipe'         => 'reschedule',
                'reference_id' => $r->id_event,
                'client_id'    => $r->client_id,
                'is_read'      => false,
            ]);
        }

        return back()->with('success', 'Pengajuan ditolak. Klien telah diberi tahu.');
    }

}
