<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tautkan appointment ke event yang lahir darinya. Dipakai untuk menandai
 * appointment otomatis "Selesai" ketika event-nya mencapai Deal, dan mencegah
 * scheduler auto-batal membatalkan appointment yang sudah menghasilkan deal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedBigInteger('id_event')->nullable()->after('id_pegawai');

            $table->foreign('id_event')
                  ->references('id_event')
                  ->on('events')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['id_event']);
            $table->dropColumn('id_event');
        });
    }
};
