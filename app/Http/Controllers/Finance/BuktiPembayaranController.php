<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Mail\BuktiDiverifikasi;
use App\Mail\BuktiDitolak;
use App\Models\BuktiPembayaran;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class BuktiPembayaranController extends Controller
{
    use ChecksPegawaiRole;


    public function index(Request $request)
    {
        $this->checkFinance();

        $query = BuktiPembayaran::with(['event.client', 'client'])
            ->latest();

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            // Bungkus dalam satu closure agar OR tidak bocor keluar dan bypass filter status
            $query->where(function ($q) use ($request) {
                $q->whereHas('event', fn($q2) =>
                    $q2->where('nama_event', 'like', '%' . $request->search . '%')
                )->orWhereHas('client', fn($q2) =>
                    $q2->where('nama_client', 'like', '%' . $request->search . '%')
                );
            });
        }

        $buktiList = $query->paginate(15)->withQueryString()->through(fn($b) => [
            'id'              => $b->id,
            'nama_event'      => $b->event?->nama_event ?? '-',
            'tgl_event'       => $b->event?->tgl_mulai_event,
            'nama_client'     => $b->client?->nama_client ?? '-',
            'perusahaan'      => $b->client?->perusahaan_client ?? '-',
            'file_bukti'      => $b->file_bukti,
            'nominal'         => $b->nominal,
            'keterangan'      => $b->keterangan,
            'status'          => $b->status,
            'catatan_finance' => $b->catatan_finance,
            'created_at'      => $b->created_at,
        ]);

        $stats = [
            'menunggu'    => BuktiPembayaran::where('status', 'Menunggu')->count(),
            'diverifikasi'=> BuktiPembayaran::where('status', 'Diverifikasi')->count(),
            'ditolak'     => BuktiPembayaran::where('status', 'Ditolak')->count(),
        ];

        return Inertia::render('Finance/BuktiPembayaran/Index', [
            'buktiList' => $buktiList,
            'stats'     => $stats,
            'filters'   => $request->only(['status', 'search']),
        ]);
    }

    public function verifikasi(Request $request, $id)
    {
        $this->checkFinance();

        $request->validate([
            'status'          => 'required|in:Diverifikasi,Ditolak,Menunggu',
            'catatan_finance' => 'nullable|string|max:500',
        ]);

        $bukti      = BuktiPembayaran::findOrFail($id);
        $statusLama = $bukti->status;
        $statusBaru = $request->status;

        // Semua operasi DB dibungkus transaction agar atomic
        DB::transaction(function () use ($bukti, $statusLama, $statusBaru, $request) {
            // Jika diverifikasi → buat Transaksi otomatis
            if ($statusBaru === 'Diverifikasi' && $statusLama !== 'Diverifikasi') {
                if ($bukti->nominal > 0) {
                    // Hapus transaksi lama dulu kalau ada (dari verifikasi sebelumnya)
                    if ($bukti->transaksi_id) {
                        Transaksi::where('id_transaksi', $bukti->transaksi_id)->delete();
                    }

                    $transaksi = Transaksi::create([
                        'id_event'   => $bukti->id_event,
                        'id_pegawai' => Auth::guard('pegawai')->id(),
                        'nominal'    => $bukti->nominal,
                        'tgl_bayar'  => now()->toDateString(),
                        'keterangan' => 'Bukti #' . $bukti->id . ($bukti->keterangan ? ' - ' . substr($bukti->keterangan, 0, 200) : ''),
                        'bukti_file' => $bukti->file_bukti,
                    ]);

                    $bukti->update([
                        'status'          => $statusBaru,
                        'catatan_finance' => $request->catatan_finance,
                        'transaksi_id'    => $transaksi->id_transaksi,
                    ]);
                } else {
                    $bukti->update([
                        'status'          => $statusBaru,
                        'catatan_finance' => $request->catatan_finance,
                    ]);
                }
            }

            // Jika ditolak atau dikembalikan ke Menunggu → hapus transaksi terkait
            elseif ($statusLama === 'Diverifikasi' && $statusBaru !== 'Diverifikasi') {
                if ($bukti->transaksi_id) {
                    Transaksi::where('id_transaksi', $bukti->transaksi_id)->delete();
                } else {
                    Transaksi::where('id_event', $bukti->id_event)
                        ->where(function ($q) use ($bukti) {
                            $q->where('keterangan', 'like', 'Bukti #' . $bukti->id . '%')
                              ->orWhere('bukti_file', $bukti->file_bukti);
                        })
                        ->delete();
                }

                $bukti->update([
                    'status'          => $statusBaru,
                    'catatan_finance' => $request->catatan_finance,
                    'transaksi_id'    => null,
                ]);
            }

            // Status lain (misal Menunggu → Ditolak langsung)
            else {
                $bukti->update([
                    'status'          => $statusBaru,
                    'catatan_finance' => $request->catatan_finance,
                ]);
            }
        });

        // Refresh object setelah transaction agar properti in-memory up-to-date
        $bukti->refresh();
        // Kirim email + notifikasi in-app ke client
        $bukti->load('client', 'event');
        $emailClient = $bukti->client?->email_client;
        $namaEvent   = $bukti->event?->nama_event ?? 'event';

        if ($statusBaru === 'Diverifikasi' && $statusLama !== 'Diverifikasi') {
            if ($emailClient) {
                try {
                    Mail::to($emailClient)->send(new BuktiDiverifikasi($bukti));
                } catch (\Exception $e) {
                    \Log::warning('Email bukti diverifikasi gagal: ' . $e->getMessage());
                }
            }
            if ($bukti->client_id) {
                \App\Models\Notifikasi::create([
                    'judul'        => '✅ Pembayaran Diverifikasi',
                    'pesan'        => "Bukti pembayaran Anda untuk event \"{$namaEvent}\"" . ($bukti->nominal ? ' sebesar Rp ' . number_format($bukti->nominal, 0, ',', '.') : '') . ' telah diverifikasi.',
                    'tipe'         => 'bukti_pembayaran',
                    'reference_id' => $bukti->id,
                    'client_id'    => $bukti->client_id,
                    'is_read'      => false,
                ]);
            }
        } elseif ($statusBaru === 'Ditolak' && $statusLama !== 'Ditolak') {
            if ($emailClient) {
                try {
                    Mail::to($emailClient)->send(new BuktiDitolak($bukti));
                } catch (\Exception $e) {
                    \Log::warning('Email bukti ditolak gagal: ' . $e->getMessage());
                }
            }
            if ($bukti->client_id) {
                \App\Models\Notifikasi::create([
                    'judul'        => '❌ Bukti Pembayaran Ditolak',
                    'pesan'        => "Bukti pembayaran untuk event \"{$namaEvent}\" ditolak." . ($bukti->catatan_finance ? " Alasan: {$bukti->catatan_finance}" : ' Mohon upload ulang.'),
                    'tipe'         => 'bukti_pembayaran',
                    'reference_id' => $bukti->id,
                    'client_id'    => $bukti->client_id,
                    'is_read'      => false,
                ]);
            }
        }

        return back()->with('success', 'Status bukti pembayaran berhasil diperbarui.');
    }
}
