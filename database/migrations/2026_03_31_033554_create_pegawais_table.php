<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pegawais', function (Blueprint $table) {
            $table->id('id_pegawai');

            $table->string('nama_pegawai');
            $table->enum('jenis_pegawai', ['Internal', 'Eksternal']);
            $table->string('posisi_pegawai');
            $table->string('no_hp_pegawai');
            $table->string('email_pegawai')->unique();
            $table->string('password_pegawai');
            $table->unsignedBigInteger('gaji_pokok')->default(0);
            $table->enum('rekomendasi_rehire', ['Yes', 'No'])->default('Yes');
            $table->text('note_pegawai')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pegawais');
    }
};
