<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Log follow-up klien oleh tim (terutama client sumber Internal yang
 * di-approach EM). Tiap baris = satu catatan follow-up dengan waktu & pegawai
 * yang mencatat, agar riwayat komunikasi dengan calon klien terlacak.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_client');
            $table->unsignedBigInteger('id_pegawai')->nullable();
            $table->text('catatan');
            $table->timestamps();

            $table->foreign('id_client')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->nullOnDelete();

            $table->index('id_client');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_follow_ups');
    }
};
