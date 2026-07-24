<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jam loading in & loading out acara. Rentang inilah yang menentukan bentrok
 * antar-acara di area yang sama (bukan sekadar jam acara), karena tim butuh
 * waktu bongkar-pasang di luar jam acara. Bila kosong, sistem memakai jam
 * acara sebagai gantinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->time('loading_in')->nullable()->after('jam_selesai');
            $table->time('loading_out')->nullable()->after('loading_in');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['loading_in', 'loading_out']);
        });
    }
};
