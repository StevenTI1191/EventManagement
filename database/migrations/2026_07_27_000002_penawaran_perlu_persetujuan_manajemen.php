<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Penawaran tidak lagi langsung terkirim ke klien begitu prospek naik ke tahap
 * Negotiation. Ia harus diajukan dulu ke Pihak Manajemen; baru setelah
 * disetujui, email beserta dokumen penawaran dikirimkan.
 *
 * Statusnya melekat pada acara (bukan tabel tersendiri) karena satu acara hanya
 * punya satu penawaran berjalan, dan riwayat penolakannya cukup diwakili catatan
 * terakhir ditambah jejak pada note_event.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // NULL = belum pernah diajukan. Isi: Diajukan | Disetujui | Ditolak.
            $table->string('penawaran_status', 20)->nullable()->after('tgl_respon_klien');
            $table->unsignedBigInteger('penawaran_diajukan_oleh')->nullable()->after('penawaran_status');
            $table->timestamp('penawaran_diajukan_pada')->nullable()->after('penawaran_diajukan_oleh');
            $table->unsignedBigInteger('penawaran_ditinjau_oleh')->nullable()->after('penawaran_diajukan_pada');
            $table->timestamp('penawaran_ditinjau_pada')->nullable()->after('penawaran_ditinjau_oleh');
            // Alasan penolakan dari Manajemen, supaya EM tahu apa yang diperbaiki.
            $table->string('penawaran_catatan', 500)->nullable()->after('penawaran_ditinjau_pada');

            $table->foreign('penawaran_diajukan_oleh')->references('id_pegawai')->on('pegawais')->nullOnDelete();
            $table->foreign('penawaran_ditinjau_oleh')->references('id_pegawai')->on('pegawais')->nullOnDelete();

            $table->index('penawaran_status');
        });

        // Acara yang terlanjur berada di Negotiation ke atas penawarannya sudah
        // benar-benar terkirim sebelum aturan ini berlaku — ditandai Disetujui
        // agar tidak mendadak dianggap menunggu persetujuan dan terkirim ulang.
        DB::table('events')
            ->whereIn('status_event', ['Negotiation', 'Deal', 'Upcoming', 'Penyelesaian', 'Done'])
            ->where('tipe_event', 'Eksternal')
            ->update([
                'penawaran_status'        => 'Disetujui',
                'penawaran_ditinjau_pada' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['penawaran_diajukan_oleh']);
            $table->dropForeign(['penawaran_ditinjau_oleh']);
            $table->dropIndex(['penawaran_status']);
            $table->dropColumn([
                'penawaran_status',
                'penawaran_diajukan_oleh',
                'penawaran_diajukan_pada',
                'penawaran_ditinjau_oleh',
                'penawaran_ditinjau_pada',
                'penawaran_catatan',
            ]);
        });
    }
};
