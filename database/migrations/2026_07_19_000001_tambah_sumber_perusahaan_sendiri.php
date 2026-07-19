<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tambah pilihan sumber klien "Perusahaan Sendiri" — untuk acara yang
 * diselenggarakan PT Laksamana Muda sendiri, bukan pesanan klien luar.
 *
 * Kolomnya ENUM di level database, jadi nilai baru HARUS didaftarkan di sini.
 * Tanpa migrasi ini MySQL menolak penyimpanan dengan galat data truncated.
 * Dipakai ALTER mentah karena ->change() pada enum tidak dapat diandalkan.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE `clients` MODIFY COLUMN `sumber` "
            . "ENUM('Mandiri','Internal','Perusahaan Sendiri') NOT NULL DEFAULT 'Mandiri'"
        );
    }

    public function down(): void
    {
        // Kembalikan yang sudah ditandai "Perusahaan Sendiri" agar tidak
        // tertolak saat enum dipersempit lagi.
        DB::table('clients')->where('sumber', 'Perusahaan Sendiri')->update(['sumber' => 'Internal']);

        DB::statement(
            "ALTER TABLE `clients` MODIFY COLUMN `sumber` "
            . "ENUM('Mandiri','Internal') NOT NULL DEFAULT 'Mandiri'"
        );
    }
};
