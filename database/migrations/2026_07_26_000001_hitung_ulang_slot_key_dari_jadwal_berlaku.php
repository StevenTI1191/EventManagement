<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Hitung ulang slot_key appointment aktif dari JADWAL YANG BERLAKU.
 *
 * Sebelumnya kuncinya selalu diambil dari tgl_request/jam_request, sehingga
 * appointment yang sudah dijadwal ulang tim tetap mengunci slot yang diminta
 * semula: jam lama terkunci padahal kosong, jam baru terbuka padahal terpakai.
 * Model kini menghitungnya dari hasil konfirmasi bila sudah ada (lihat
 * Appointment::jadwalBerlaku), tapi baris yang sudah tersimpan tidak berubah
 * sampai ia disimpan lagi — jadi diselaraskan di sini.
 *
 * Bila dua appointment aktif jatuh ke slot berlaku yang sama (bisa terjadi
 * karena celah itulah), hanya yang paling awal memegang kuncinya; sisanya
 * dibiarkan NULL supaya unique index tidak gagal. Mengikuti cara yang sama
 * seperti saat slot_key pertama diperkenalkan (2026_07_22_000001).
 */
return new class extends Migration
{
    /** Status appointment yang dianggap masih menempati slot. */
    private const AKTIF = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    public function up(): void
    {
        $dipakai = [];

        $rows = DB::table('appointments')
            ->whereIn('status', self::AKTIF)
            ->orderBy('id')
            ->get(['id', 'tgl_request', 'jam_request', 'tgl_konfirmasi', 'jam_konfirmasi', 'slot_key']);

        foreach ($rows as $r) {
            // Konfirmasi dipakai hanya bila tanggal DAN jamnya lengkap; kalau
            // tidak, jadwal yang berlaku masih permintaan semula.
            $pakaiKonfirmasi = ! empty($r->tgl_konfirmasi) && ! empty($r->jam_konfirmasi);

            $tgl = $pakaiKonfirmasi ? $r->tgl_konfirmasi : $r->tgl_request;
            $jam = $pakaiKonfirmasi ? $r->jam_konfirmasi : $r->jam_request;

            if (empty($tgl) || empty($jam)) {
                DB::table('appointments')->where('id', $r->id)->update(['slot_key' => null]);
                continue;
            }

            $key = substr((string) $tgl, 0, 10) . '|' . substr((string) $jam, 0, 5);

            // Kunci yang sama sudah dipegang appointment lain yang lebih dulu.
            $baru = isset($dipakai[$key]) ? null : $key;
            if ($baru !== null) {
                $dipakai[$key] = true;
            }

            if ($r->slot_key !== $baru) {
                DB::table('appointments')->where('id', $r->id)->update(['slot_key' => $baru]);
            }
        }
    }

    public function down(): void
    {
        // Kembalikan kunci ke slot yang diminta klien (perilaku lama).
        $dipakai = [];

        $rows = DB::table('appointments')
            ->whereIn('status', self::AKTIF)
            ->whereNotNull('jam_request')
            ->orderBy('id')
            ->get(['id', 'tgl_request', 'jam_request']);

        foreach ($rows as $r) {
            $key = substr((string) $r->tgl_request, 0, 10) . '|' . substr((string) $r->jam_request, 0, 5);

            $baru = isset($dipakai[$key]) ? null : $key;
            if ($baru !== null) {
                $dipakai[$key] = true;
            }

            DB::table('appointments')->where('id', $r->id)->update(['slot_key' => $baru]);
        }
    }
};
