<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Event tahap "Planning" dibuat dari form ringkas (tanpa client & PIC dulu),
 * jadi id_client & id_pegawai harus boleh NULL. FK tetap cascade saat terisi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['id_client']);
            $table->dropForeign(['id_pegawai']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->unsignedBigInteger('id_client')->nullable()->change();
            $table->unsignedBigInteger('id_pegawai')->nullable()->change();

            $table->foreign('id_client')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['id_client']);
            $table->dropForeign(['id_pegawai']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->unsignedBigInteger('id_client')->nullable(false)->change();
            $table->unsignedBigInteger('id_pegawai')->nullable(false)->change();

            $table->foreign('id_client')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->onDelete('cascade');
        });
    }
};
