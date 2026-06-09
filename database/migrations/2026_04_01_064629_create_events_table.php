<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id('id_event');
            $table->unsignedBigInteger('id_client');
            $table->unsignedBigInteger('id_pegawai');

            $table->string('nama_event');
            $table->string('kategori_event')->nullable(); // ← tambah ini
            $table->text('deskripsi_event')->nullable();
            $table->date('tgl_mulai_event');
            $table->date('tgl_selesai_event')->nullable();

            $table->time('jam_mulai')->nullable();
            $table->time('jam_selesai')->nullable();
            $table->time('jam_meeting')->nullable();
            $table->time('jam_keluar_makanan')->nullable();

            $table->string('area_event')->nullable();
            $table->integer('jumlah_pax')->default(0);
            $table->text('note_event')->nullable();

            $table->text('food_beverage_event')->nullable();
            $table->text('entairtainment_event')->nullable();

            $table->string('poster_event')->nullable();
            $table->string('kontrak_file')->nullable();
            $table->string('technical_meeting')->nullable();
            $table->string('gladi_resik')->nullable();

            $table->string('status_event')->default('Pending');
            $table->decimal('deal_harga_event', 15, 2)->default(0);

            $table->timestamps();

            $table->foreign('id_client')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
