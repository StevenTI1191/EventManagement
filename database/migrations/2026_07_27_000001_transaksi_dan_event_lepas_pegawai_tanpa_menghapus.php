<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menghapus pegawai tidak boleh menghapus catatan keuangan maupun acara.
 *
 * `transaksis.id_pegawai` memakai onDelete('cascade') dengan kolom NOT NULL,
 * sehingga menghapus seorang pegawai IKUT MENGHAPUS seluruh baris buku kas yang
 * pernah ia catat. Penjagaan di Manajemen\PegawaiController hanya memeriksa acara
 * yang ia pegang sebagai PIC — dan pegawai Finance justru tidak pernah menjadi
 * PIC acara, sehingga ia selalu lolos penjagaan itu. Akibatnya pembayaran yang
 * dicatatnya lenyap: laporan laba bersih berubah, tagihan yang sudah lunas
 * kembali "Belum Dibayar" saat PelunasanInvoice::sinkron menghitung ulang dari
 * buku kas, dan acara bisa dianggap belum lunas lagi.
 *
 * `events.id_pegawai` juga masih cascade padahal kolomnya sudah dijadikan
 * nullable (2026_07_06_000002) — kombinasi yang tidak koheren: sekali penjagaan
 * di controller terlewat, menghapus satu pegawai akan menghapus acaranya.
 *
 * Kolom lain yang menunjuk pegawai sudah memakai null-on-delete: tugas,
 * appointments, invoices, dan client_follow_ups. Dua tabel ini disamakan.
 * Penanggung jawab yang sudah dihapus tampil sebagai "-" (kode pembacanya sudah
 * null-safe), sedangkan datanya tetap utuh.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaksis', function (Blueprint $table) {
            $table->dropForeign(['id_pegawai']);
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pegawai')->nullable()->change();
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->nullOnDelete();
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['id_pegawai']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['id_pegawai']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->onDelete('cascade');
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->dropForeign(['id_pegawai']);
        });

        // Baris yang penanggung jawabnya sudah dilepas tidak bisa dikembalikan ke
        // NOT NULL; diarahkan ke pegawai terlama agar perubahan kolomnya lolos.
        $pengganti = \Illuminate\Support\Facades\DB::table('pegawais')->min('id_pegawai');
        if ($pengganti !== null) {
            \Illuminate\Support\Facades\DB::table('transaksis')
                ->whereNull('id_pegawai')
                ->update(['id_pegawai' => $pengganti]);
        }

        Schema::table('transaksis', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pegawai')->nullable(false)->change();
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->foreign('id_pegawai')->references('id_pegawai')->on('pegawais')->onDelete('cascade');
        });
    }
};
