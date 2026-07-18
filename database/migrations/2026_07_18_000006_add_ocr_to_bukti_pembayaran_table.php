<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Simpan hasil pembacaan OCR atas bukti transfer agar Finance bisa melihat
 * apa yang terbaca sistem saat memverifikasi — bukan sekadar percaya angka
 * yang diketik klien.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->decimal('ocr_nominal', 15, 2)->nullable()->after('nominal');
            // Cocok | Selisih | Tidak Terbaca | Tidak Dinilai
            $table->string('ocr_status')->nullable()->after('ocr_nominal');
            $table->text('ocr_teks')->nullable()->after('ocr_status');
        });
    }

    public function down(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->dropColumn(['ocr_nominal', 'ocr_status', 'ocr_teks']);
        });
    }
};
