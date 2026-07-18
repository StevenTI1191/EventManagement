<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perjelas follow-up klien:
 *  - id_event  : follow-up ini menyangkut event/prospek yang mana (opsional,
 *                karena ada juga follow-up umum yang belum terkait event).
 *  - tgl_berikutnya : kapan harus di-follow-up lagi → dipakai scheduler untuk
 *                mengingatkan pegawai yang mencatat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->unsignedBigInteger('id_event')->nullable()->after('id_pegawai');
            $table->date('tgl_berikutnya')->nullable()->after('catatan');
            $table->boolean('reminder_terkirim')->default(false)->after('tgl_berikutnya');

            $table->foreign('id_event')->references('id_event')->on('events')->nullOnDelete();
            $table->index('tgl_berikutnya');
        });
    }

    public function down(): void
    {
        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->dropForeign(['id_event']);
            $table->dropIndex(['tgl_berikutnya']);
            $table->dropColumn(['id_event', 'tgl_berikutnya', 'reminder_terkirim']);
        });
    }
};
