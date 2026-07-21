<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jenis klien: Perorangan (pribadi) atau Perusahaan. Menentukan apakah nama
 * perusahaan wajib diisi. Klien lama yang belum punya nama perusahaan dianggap
 * Perorangan agar tidak terus diminta melengkapinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->enum('tipe_client', ['Perorangan', 'Perusahaan'])
                ->default('Perusahaan')->after('perusahaan_client');
        });

        DB::table('clients')
            ->where(fn ($q) => $q->whereNull('perusahaan_client')->orWhere('perusahaan_client', ''))
            ->update(['tipe_client' => 'Perorangan']);
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('tipe_client');
        });
    }
};
