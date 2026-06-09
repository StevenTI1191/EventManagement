<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->unsignedBigInteger('transaksi_id')->nullable()->after('catatan_finance');
        });
    }

    public function down(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->dropColumn('transaksi_id');
        });
    }
};