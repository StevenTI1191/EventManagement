<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tugas', function (Blueprint $table) {
            $table->string('kategori')->nullable()->after('nama_tugas');       // Talent, Legalitas, dst
            $table->string('timeline')->nullable()->after('kategori');         // H-60, H-7 (teks)
            $table->unsignedBigInteger('id_pegawai')->nullable()->after('timeline'); // PIC
            $table->unsignedTinyInteger('progress')->default(0)->after('status_tugas'); // 0..100
            $table->integer('urutan')->default(0)->after('progress');          // urutan dalam kategori

            $table->foreign('id_pegawai')
                  ->references('id_pegawai')
                  ->on('pegawais')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tugas', function (Blueprint $table) {
            $table->dropForeign(['id_pegawai']);
            $table->dropColumn(['kategori', 'timeline', 'id_pegawai', 'progress', 'urutan']);
        });
    }
};
