<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Memisahkan asal client:
 *  - Mandiri  : klien mendaftar sendiri lewat halaman registrasi.
 *  - Internal : klien yang di-input/di-approach sendiri oleh tim Event Marketing.
 * Data lama dianggap 'Mandiri' (default) karena berasal dari pendaftaran.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->enum('sumber', ['Mandiri', 'Internal'])
                ->default('Mandiri')
                ->after('email_client');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('sumber');
        });
    }
};
