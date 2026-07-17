<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invoice untuk event eksternal (dari klien):
 *  - DP        : tagihan uang muka 50% setelah event mencapai tahap Deal.
 *  - Pelunasan : tagihan sisa 50% setelah DP dibayar (event Upcoming).
 * PDF di-generate dari data ini, dan dapat dilihat klien pada detail event-nya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id('id_invoice');
            $table->unsignedBigInteger('id_event');
            $table->unsignedBigInteger('id_pegawai')->nullable(); // penerbit (Finance)
            $table->string('nomor_invoice')->unique();
            $table->enum('tipe', ['DP', 'Pelunasan']);
            $table->decimal('nominal', 15, 2);
            $table->date('tgl_terbit');
            $table->date('tgl_jatuh_tempo')->nullable();
            $table->enum('status', ['Belum Dibayar', 'Lunas'])->default('Belum Dibayar');
            $table->text('keterangan')->nullable();
            $table->timestamps();

            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('cascade');
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->nullOnDelete();
            $table->index(['id_event', 'tipe']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
