<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catatan meeting internal EM pada appointment — hasil/poin pembahasan saat
 * meeting berlangsung atau setelah selesai. Terpisah dari catatan_em yang
 * merupakan catatan untuk client (ditampilkan ke client saat konfirmasi).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('catatan_meeting')->nullable()->after('catatan_em');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('catatan_meeting');
        });
    }
};
