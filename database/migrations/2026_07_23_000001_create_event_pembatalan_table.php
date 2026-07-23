<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengajuan pembatalan + refund acara. Alur tiga pihak:
 *   Klien (Diajukan) → Manajemen (Disetujui/Ditolak) → Finance (Selesai + refund).
 * Satu acara boleh punya banyak riwayat pengajuan, tapi hanya satu yang aktif
 * (Diajukan/Disetujui) pada satu waktu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_pembatalan', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_event');
            $table->unsignedBigInteger('client_id')->nullable();     // pengaju (klien)
            $table->text('alasan');                                   // alasan klien
            $table->enum('status', ['Diajukan', 'Disetujui', 'Ditolak', 'Selesai'])->default('Diajukan');
            $table->text('catatan_manajemen')->nullable();            // catatan saat setuju/tolak
            $table->unsignedBigInteger('disetujui_oleh')->nullable(); // pegawai Manajemen
            $table->timestamp('disetujui_pada')->nullable();
            $table->decimal('refund_nominal', 15, 2)->nullable();     // diisi Finance saat proses
            $table->unsignedBigInteger('diproses_oleh')->nullable();  // pegawai Finance
            $table->timestamp('diproses_pada')->nullable();
            $table->timestamps();

            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('cascade');
            $table->index(['id_event', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_pembatalan');
    }
};
