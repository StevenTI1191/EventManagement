<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Memisahkan jenis event:
 *  - Internal  : berasal dari menu Planning Event (acara milik LMB sendiri).
 *                Alur: Planning -> finalisasi -> Upcoming (melewati pipeline).
 *  - Eksternal : berasal dari klien (appointment / di-approach EM).
 *                Alur pipeline: Lead -> Negotiation -> Deal -> (DP 50%) -> Upcoming.
 *
 * Catatan: kolom status_event bertipe string, jadi nilai baru
 * (Lead, Negotiation, Deal) tidak butuh perubahan skema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->enum('tipe_event', ['Internal', 'Eksternal'])
                ->default('Eksternal')
                ->after('status_event');
        });

        // Event Planning yang sudah ada = event internal milik LMB.
        DB::table('events')->where('status_event', 'Planning')->update(['tipe_event' => 'Internal']);
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('tipe_event');
        });
    }
};
