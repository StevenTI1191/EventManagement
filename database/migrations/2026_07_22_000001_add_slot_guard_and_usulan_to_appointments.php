<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dua penguatan alur appointment:
 *  1. slot_key — kunci unik "tanggal|jam" untuk appointment yang masih aktif,
 *     agar dua klien tak bisa memesan slot yang sama nyaris bersamaan (race
 *     condition). Diisi otomatis oleh model; NULL saat appointment tak aktif
 *     sehingga slotnya kembali bebas.
 *  2. usulan_* — usulan jadwal alternatif DARI klien (reschedule dua arah).
 *     Sebelumnya hanya tim yang bisa menjadwal ulang; kini klien bisa
 *     mengusulkan waktu lain untuk ditinjau tim.
 */
return new class extends Migration
{
    /** Status appointment yang dianggap masih menempati slot. */
    private const AKTIF = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('slot_key', 32)->nullable()->after('jam_request');
            $table->date('usulan_tgl')->nullable()->after('catatan_meeting');
            $table->time('usulan_jam')->nullable()->after('usulan_tgl');
            $table->string('usulan_catatan', 500)->nullable()->after('usulan_jam');
        });

        // Backfill slot_key untuk appointment aktif. Bila ada duplikat lama pada
        // slot yang sama, hanya yang paling awal dipegang; sisanya dibiarkan NULL
        // supaya penambahan unique index tidak gagal.
        $seen = [];
        $rows = DB::table('appointments')
            ->whereIn('status', self::AKTIF)
            ->whereNotNull('jam_request')
            ->orderBy('id')
            ->get(['id', 'tgl_request', 'jam_request']);

        foreach ($rows as $r) {
            $key = substr((string) $r->tgl_request, 0, 10) . '|' . substr((string) $r->jam_request, 0, 5);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            DB::table('appointments')->where('id', $r->id)->update(['slot_key' => $key]);
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->unique('slot_key');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropUnique(['slot_key']);
            $table->dropColumn(['slot_key', 'usulan_tgl', 'usulan_jam', 'usulan_catatan']);
        });
    }
};
