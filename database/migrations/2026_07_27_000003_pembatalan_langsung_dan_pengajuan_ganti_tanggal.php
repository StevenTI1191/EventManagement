<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Aturan pembatalan diganti menyeluruh.
 *
 * LAMA : klien mengajukan pembatalan + refund, lalu disetujui berurutan oleh
 *        Event Marketing, Finance (menetapkan nominal refund), dan Manajemen.
 * BARU : uang muka HANGUS bila acara dibatalkan, sehingga tidak ada lagi nominal
 *        refund yang perlu ditetapkan maupun dirundingkan. Pembatalan berlaku
 *        seketika — klien sudah diberi peringatan tegas sebelum menekannya.
 *
 * Sebagai gantinya klien diberi jalan keluar yang tidak merugikan: MENGGANTI
 * TANGGAL acara. Uang mukanya tetap berlaku, tetapi jadwal barunya harus
 * disetujui Pihak Manajemen karena menyangkut ketersediaan venue.
 *
 * Kolom persetujuan berjenjang dan nominal refund dilepas dari event_pembatalan
 * karena tak lagi punya arti; tabelnya kini murni catatan riwayat pembatalan.
 * Ikut dibersihkan pula sisa alur dua pihak yang lebih tua (disetujui_oleh,
 * diproses_oleh, catatan_manajemen) yang sudah tak terpakai sejak lama.
 *
 * Penghapusan dilakukan secara defensif: kolom-kolom itu ditambahkan pada
 * migrasi terdahulu TANPA foreign key, dan susunannya bisa berbeda antara mesin
 * pengembangan dengan server. Menghapus membabi buta akan gagal di salah
 * satunya, jadi keberadaan tiap kunci & kolom diperiksa lebih dulu.
 */
return new class extends Migration
{
    /** Kolom sisa alur persetujuan lama yang sudah tidak bermakna. */
    private const KOLOM_USANG = [
        'em_oleh', 'em_pada',
        'finance_oleh', 'finance_pada', 'refund_nominal',
        'manajemen_oleh', 'manajemen_pada',
        'catatan_manajemen', 'catatan_tolak', 'ditolak_peran',
        'disetujui_oleh', 'disetujui_pada', 'diproses_oleh',
    ];

    /** Nama foreign key yang benar-benar terpasang pada sebuah kolom. */
    private function namaForeignKey(string $tabel, string $kolom): ?string
    {
        return DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $tabel)
            ->where('COLUMN_NAME', $kolom)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->value('CONSTRAINT_NAME');
    }

    public function up(): void
    {
        // Bila migrasi ini pernah gagal di tengah jalan, tabelnya sudah terlanjur
        // ada tanpa tercatat. Isinya pasti masih kosong (belum ada jalur yang
        // menulisinya sebelum migrasi tuntas), jadi aman dibuat ulang.
        Schema::dropIfExists('event_reschedule');

        Schema::create('event_reschedule', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_event');
            $table->unsignedBigInteger('client_id')->nullable();

            // Jadwal lama disalin saat pengajuan dibuat, supaya riwayatnya tetap
            // terbaca setelah tanggal acara berpindah.
            $table->date('tgl_lama');
            $table->date('tgl_baru');
            $table->date('tgl_selesai_baru')->nullable();
            $table->string('alasan', 1000);

            $table->string('status', 20)->default('Diajukan'); // Diajukan | Disetujui | Ditolak
            $table->unsignedBigInteger('manajemen_oleh')->nullable();
            $table->timestamp('manajemen_pada')->nullable();
            $table->string('catatan_tolak', 500)->nullable();

            $table->timestamps();

            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('cascade');
            $table->foreign('client_id')->references('id')->on('clients')->nullOnDelete();
            $table->foreign('manajemen_oleh')->references('id_pegawai')->on('pegawais')->nullOnDelete();
            $table->index(['id_event', 'status']);
        });

        // Lepas kunci asing yang memang terpasang, satu per satu.
        foreach (self::KOLOM_USANG as $kolom) {
            if (! Schema::hasColumn('event_pembatalan', $kolom)) {
                continue;
            }

            if ($nama = $this->namaForeignKey('event_pembatalan', $kolom)) {
                Schema::table('event_pembatalan', function (Blueprint $table) use ($nama) {
                    $table->dropForeign($nama);
                });
            }
        }

        $dibuang = array_values(array_filter(
            self::KOLOM_USANG,
            fn ($k) => Schema::hasColumn('event_pembatalan', $k),
        ));

        Schema::table('event_pembatalan', function (Blueprint $table) use ($dibuang) {
            if ($dibuang) {
                $table->dropColumn($dibuang);
            }

            // Berapa uang klien yang hangus saat pembatalan — dicatat agar
            // nilainya tetap terbaca di riwayat meski transaksinya tidak diubah.
            if (! Schema::hasColumn('event_pembatalan', 'dp_hangus')) {
                $table->decimal('dp_hangus', 15, 2)->default(0)->after('alasan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_pembatalan', function (Blueprint $table) {
            $table->unsignedBigInteger('em_oleh')->nullable();
            $table->timestamp('em_pada')->nullable();
            $table->unsignedBigInteger('finance_oleh')->nullable();
            $table->timestamp('finance_pada')->nullable();
            $table->decimal('refund_nominal', 15, 2)->nullable();
            $table->unsignedBigInteger('manajemen_oleh')->nullable();
            $table->timestamp('manajemen_pada')->nullable();
            $table->string('catatan_manajemen', 500)->nullable();
            $table->string('catatan_tolak', 500)->nullable();
            $table->string('ditolak_peran', 30)->nullable();
            $table->unsignedBigInteger('disetujui_oleh')->nullable();
            $table->timestamp('disetujui_pada')->nullable();
            $table->unsignedBigInteger('diproses_oleh')->nullable();

            $table->dropColumn('dp_hangus');
        });

        Schema::dropIfExists('event_reschedule');
    }
};
