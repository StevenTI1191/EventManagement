<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Hapus pilihan sumber klien "Perusahaan Sendiri".
 *
 * Pilihan itu dibuat agar acara milik LM sendiri punya klien, padahal Planning
 * Event sudah menangani acara internal tanpa klien sama sekali. Keberadaannya
 * justru membingungkan: satu acara internal bisa tercatat dua cara.
 *
 * Kebalikan dari migrasi 2026_07_19_000001.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Kembalikan ke Internal lebih dulu agar penyempitan enum tidak menolak
        // baris yang masih memakai nilai lama.
        DB::table('clients')->where('sumber', 'Perusahaan Sendiri')->update(['sumber' => 'Internal']);

        DB::statement(
            "ALTER TABLE `clients` MODIFY COLUMN `sumber` "
            . "ENUM('Mandiri','Internal') NOT NULL DEFAULT 'Mandiri'"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE `clients` MODIFY COLUMN `sumber` "
            . "ENUM('Mandiri','Internal','Perusahaan Sendiri') NOT NULL DEFAULT 'Mandiri'"
        );
    }
};
