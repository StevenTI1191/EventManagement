<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Target perencanaan pada tahap Planning Event: target jumlah pax & target omset.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->integer('target_pax')->nullable()->after('harga_per_pax');
            $table->decimal('target_omset', 15, 2)->nullable()->after('target_pax');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['target_pax', 'target_omset']);
        });
    }
};
