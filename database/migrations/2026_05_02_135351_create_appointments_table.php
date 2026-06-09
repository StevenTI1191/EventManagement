<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->string('jenis_event');
            $table->text('deskripsi_event')->nullable();
            $table->integer('jumlah_tamu')->nullable();
            $table->decimal('estimasi_budget', 15, 2)->nullable();
            $table->date('tgl_request');
            $table->time('jam_request')->nullable();
            $table->date('tgl_konfirmasi')->nullable();
            $table->time('jam_konfirmasi')->nullable();
            $table->enum('status', ['Pending', 'Dikonfirmasi', 'Reschedule', 'Selesai', 'Dibatalkan'])->default('Pending');
            $table->text('catatan_em')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
