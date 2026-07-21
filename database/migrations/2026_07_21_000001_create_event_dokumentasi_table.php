<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto dokumentasi acara. Diunggah tim setelah acara masuk tahap Penyelesaian
 * atau Done, lalu ditampilkan sebagai galeri di portfolio publik saat acaranya
 * diklik. Satu acara bisa punya banyak foto.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_dokumentasi', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_event');
            $table->string('file_path');
            $table->string('keterangan')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();

            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('cascade');
            $table->index('id_event');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_dokumentasi');
    }
};
