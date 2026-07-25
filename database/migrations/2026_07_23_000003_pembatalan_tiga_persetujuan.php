<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ubah persetujuan pembatalan dari 2 pihak (Manajemen → Finance) menjadi 3
 * pihak BERURUTAN: Event Marketing → Finance (menetapkan nominal refund) →
 * Manajemen (persetujuan akhir sekaligus pemrosesan). Tiap tahap direkam
 * siapa & kapan menyetujuinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        // status jadi VARCHAR supaya bisa menampung nilai tahap baru.
        DB::statement("ALTER TABLE event_pembatalan MODIFY status VARCHAR(30) NOT NULL DEFAULT 'Diajukan'");

        // Pengajuan lama yang masih berjalan dikembalikan ke awal alur baru.
        DB::table('event_pembatalan')->where('status', 'Disetujui')->update(['status' => 'Diajukan']);

        Schema::table('event_pembatalan', function (Blueprint $table) {
            $table->unsignedBigInteger('em_oleh')->nullable()->after('alasan');
            $table->timestamp('em_pada')->nullable()->after('em_oleh');
            $table->unsignedBigInteger('finance_oleh')->nullable()->after('em_pada');
            $table->timestamp('finance_pada')->nullable()->after('finance_oleh');
            $table->unsignedBigInteger('manajemen_oleh')->nullable()->after('finance_pada');
            $table->timestamp('manajemen_pada')->nullable()->after('manajemen_oleh');
            $table->string('catatan_tolak', 500)->nullable()->after('catatan_manajemen');
            $table->string('ditolak_peran', 20)->nullable()->after('catatan_tolak');
        });
    }

    public function down(): void
    {
        Schema::table('event_pembatalan', function (Blueprint $table) {
            $table->dropColumn([
                'em_oleh', 'em_pada', 'finance_oleh', 'finance_pada',
                'manajemen_oleh', 'manajemen_pada', 'catatan_tolak', 'ditolak_peran',
            ]);
        });
        DB::statement("ALTER TABLE event_pembatalan MODIFY status ENUM('Diajukan','Disetujui','Ditolak','Selesai') NOT NULL DEFAULT 'Diajukan'");
    }
};
