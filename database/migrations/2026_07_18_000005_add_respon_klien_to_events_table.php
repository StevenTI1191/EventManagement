<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rekam respon klien atas penawaran, supaya alur di sisi klien tidak buntu:
 * setelah menolak, kartu penawaran menampilkan status "sudah ditolak" beserta
 * tanggalnya — bukan tampil polos seolah belum pernah direspon.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('respon_klien')->nullable()->after('status_event');   // Diterima | Ditolak
            $table->timestamp('tgl_respon_klien')->nullable()->after('respon_klien');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['respon_klien', 'tgl_respon_klien']);
        });
    }
};
