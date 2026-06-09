<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas', function (Blueprint $table) {
            $table->id('id_tugas');
            $table->unsignedBigInteger('id_event');

            $table->string('nama_tugas');
            $table->text('deskripsi_tugas')->nullable();
            $table->text('catatan_tugas')->nullable();
            $table->date('deadline_tugas')->nullable();
            $table->string('status_tugas')->default('Ongoing'); // Ongoing, Done

            $table->timestamps();

            $table->foreign('id_event')
                  ->references('id_event')
                  ->on('events')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tugas');
    }
};
