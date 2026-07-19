<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Mail\BuktiDiverifikasi;
use App\Mail\BuktiDitolak;
use App\Models\BuktiPembayaran;
use App\Models\Event;
use App\Models\Invoice;
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

        $query = BuktiPembayaran::with(['event.client', 'client', 'invoice'])
            ->latest();

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Saring per tagihan — memudahkan menelusuri pembayaran satu invoice.
        if ($request->id_invoice) {
            $query->where('id_invoice', $request->id_invoice);
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
            // Tagihan yang dibayar — supaya jelas bukti ini untuk invoice mana.
            'invoice'         => $b->invoice ? [
                'id'      => $b->invoice->id_invoice,
                'nomor'   => $b->invoice->nomor_invoice,
                'tipe'    => $b->invoice->tipe,
                'nominal' => $b->invoice->nominal,
                'status'  => $b->invoice->status,
            ] : null,
            'keterangan'      => $b->keterangan,
            'status'          => $b->status,
            'catatan_finance' => $b->catatan_finance,
            'created_at'      => $b->created_at,
            // Hasil pembacaan otomatis — pembantu verifikasi, bukan penentu.
            'ocr_nominal'     => $b->ocr_nominal,
            'ocr_status'      => $b->ocr_status,
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

                    // Pembayaran klien terverifikasi → jika sudah menutup DP, event
                    // Deal otomatis naik ke Upcoming (sejalan dengan Invoice::lunas).
                    $this->promosikanJikaDpTerpenuhi($bukti->id_event);
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

            // Selaraskan status tagihan yang dibayar bukti ini.
            $this->selaraskanInvoice($bukti->id_invoice);
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

    /**
     * Samakan status invoice dengan bukti terverifikasi yang menempel padanya.
     * Idempotent: menaikkan ke Lunas saat nominalnya tertutup, dan menurunkan
     * lagi bila verifikasinya dicabut.
     *
     * Kecuali invoice DP. Kelunasan DP ditentukan aturan tingkat event di
     * promosikanJikaDpTerpenuhi() — di sana hitungannya dari seluruh transaksi
     * event, bukan per invoice, jadi bisa lunas tanpa ada bukti yang menempel
     * langsung. Karena itu DP hanya boleh dinaikkan di sini, tidak diturunkan.
     */
    private function selaraskanInvoice(?int $idInvoice): void
    {
        if (! $idInvoice) {
            return;
        }

        $invoice = Invoice::find($idInvoice);
        if (! $invoice) {
            return;
        }

        $terbayar = (float) BuktiPembayaran::where('id_invoice', $idInvoice)
            ->where('status', 'Diverifikasi')
            ->sum('nominal');

        $lunas = $terbayar >= (float) $invoice->nominal;

        if ($invoice->tipe === Invoice::TIPE_DP && ! $lunas) {
            return;
        }

        $invoice->update(['status' => $lunas ? Invoice::STATUS_LUNAS : Invoice::STATUS_BELUM]);
    }

    /**
     * Jika total pembayaran terverifikasi sebuah event eksternal sudah menutup
     * uang muka (DP 50%) dan event masih berstatus Deal, promosikan ke Upcoming
     * dan tandai invoice DP-nya lunas. Idempotent — aman dipanggil berkali-kali.
     *
     * Dipanggil di dalam DB::transaction verifikasi(), setelah Transaksi dibuat.
     */
    private function promosikanJikaDpTerpenuhi($id_event): void
    {
        $event = Event::find($id_event);

        if (! $event
            || $event->tipe_event !== Event::TIPE_EKSTERNAL
            || $event->status_event !== Event::STATUS_DEAL) {
            return;
        }

        $totalDeal = (float) ($event->deal_harga_event ?? 0);
        if ($totalDeal <= 0) {
            return;
        }

        $totalDibayar = (float) Transaksi::where('id_event', $id_event)->sum('nominal');

        if ($totalDibayar < Invoice::nominalDp($totalDeal)) {
            return;
        }

        // Uang yang masuk sudah menutup uang muka → acara boleh berjalan.
        $event->update(['status_event' => Event::STATUS_UPCOMING]);

        // Invoice DP hanya ditandai lunas bila memang dibayar. Sebelum bukti
        // punya atribusi invoice, kelunasan DP disimpulkan dari total transaksi
        // event — akibatnya satu pembayaran yang klien tandai untuk Pelunasan
        // ikut melunasi DP, sehingga dua tagihan tercatat lunas padahal uang
        // yang masuk hanya cukup untuk satu. Bukti tanpa atribusi tetap
        // diperhitungkan supaya bukti lama tidak menggantung.
        $dp = Invoice::where('id_event', $id_event)
            ->where('tipe', Invoice::TIPE_DP)
            ->where('status', '!=', Invoice::STATUS_LUNAS)
            ->first();

        if (! $dp) {
            return;
        }

        $dibayarUntukDp = (float) \App\Models\BuktiPembayaran::where('id_event', $id_event)
            ->where('status', 'Diverifikasi')
            ->where(fn ($q) => $q->where('id_invoice', $dp->id_invoice)->orWhereNull('id_invoice'))
            ->sum('nominal');

        if ($dibayarUntukDp >= (float) $dp->nominal) {
            $dp->update(['status' => Invoice::STATUS_LUNAS]);
        }
    }
}
