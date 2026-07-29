<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Negosiasi lanjutan atas penawaran: klien meminta penyesuaian sebelum
 * menerima, tim menjawab, dan bila perlu menawarkan jadwal pertemuan untuk
 * membahasnya.
 *
 * Sebelumnya permintaan penyesuaian hanya ditulis sebagai jejak teks pada
 * catatan acara lalu dikirim sebagai email ke PIC. Akibatnya tidak ada yang
 * bisa ditelusuri: klien tidak tahu permintaannya sudah ditangani atau belum,
 * tim tidak punya daftar yang harus ditindaklanjuti, dan riwayatnya hilang
 * begitu catatan acara dipakai untuk hal lain.
 *
 * Satu baris mewakili satu putaran negosiasi. Negosiasi yang berulang akan
 * menghasilkan beberapa baris pada acara yang sama, sehingga urutannya sendiri
 * sudah menjadi riwayat tanpa perlu tabel terpisah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_negosiasi', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_event');
            $table->foreign('id_event')->references('id_event')->on('events')->cascadeOnDelete();

            // Klien boleh terhapus tanpa menghilangkan riwayat negosiasinya.
            $table->unsignedBigInteger('client_id')->nullable();
            $table->foreign('client_id')->references('id')->on('clients')->nullOnDelete();

            $table->text('pesan');
            $table->boolean('minta_meeting')->default(false);

            // Diajukan  → menunggu tim
            // Dijawab   → tim sudah membalas, tanpa pertemuan
            // Dijadwalkan → tim menawarkan jadwal pertemuan, menunggu klien
            // Selesai   → klien menerima jadwalnya
            // Ditutup   → tidak dilanjutkan (mis. penawaran keburu diterima/ditolak)
            $table->string('status', 20)->default('Diajukan');

            $table->text('balasan')->nullable();

            // Pertemuan yang ditawarkan memakai Appointment yang sudah ada,
            // bukan kolom tanggal tersendiri — supaya pemeriksaan bentrok slot,
            // kalender, dan alur konfirmasi tidak terduplikasi.
            $table->unsignedBigInteger('id_appointment')->nullable();
            $table->foreign('id_appointment')->references('id')->on('appointments')->nullOnDelete();

            $table->unsignedBigInteger('ditangani_oleh')->nullable();
            $table->foreign('ditangani_oleh')->references('id_pegawai')->on('pegawais')->nullOnDelete();
            $table->timestamp('ditangani_pada')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('id_event');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_negosiasi');
    }
};
