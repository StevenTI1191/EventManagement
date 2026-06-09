<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaksi_items', function (Blueprint $table) {
            $table->id('id_item');
            $table->unsignedBigInteger('id_event');

            $table->enum('tipe', ['Pemasukan', 'Pengeluaran']);
            $table->string('nama_item');
            $table->integer('qty')->default(1);
            $table->decimal('harga', 15, 2);
            $table->decimal('total', 15, 2);
            $table->text('keterangan')->nullable();

            $table->timestamps();

            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaksi_items');
    }
};
