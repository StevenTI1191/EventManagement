<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fasilitas venue yang ditampilkan di halaman depan klien — panggung utama,
 * videotron, sound & lighting, area indoor, VIP room, dan seterusnya.
 *
 * Isinya mengikuti bagian "Fasilitas Venue" pada surat penawaran, tetapi
 * dikelola dari sistem oleh Event Marketing supaya bisa berubah tanpa mengubah
 * kode: fasilitas bertambah, fotonya diperbarui, atau urutan tampilnya digeser.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_fasilitas', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            // Mis. "4,2 x 7,6 meter" — ditampilkan sebagai penanda kecil.
            $table->string('spesifikasi')->nullable();
            $table->string('keterangan', 500)->nullable();
            // Path relatif di public/, mis. "venue/xxxx.jpg".
            $table->string('foto')->nullable();
            $table->integer('urutan')->default(0);
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index(['aktif', 'urutan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_fasilitas');
    }
};
