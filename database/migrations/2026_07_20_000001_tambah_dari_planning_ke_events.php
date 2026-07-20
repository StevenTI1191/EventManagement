<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tandai acara yang lahir dari Planning Event.
 *
 * Target pax & omset hanya dipasang pada tahap perencanaan. Setelah rencana
 * bertarget klien difinalisasi, statusnya jadi Lead dan tipenya jadi Eksternal
 * — persis seperti prospek yang di-input langsung. Tanpa penanda ini keduanya
 * tidak bisa dibedakan, sehingga form detail menawarkan isian target pada
 * acara yang memang tidak pernah punya tahap perencanaan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->boolean('dari_planning')->default(false)->after('tipe_event');
        });

        // Acara lama: yang masih Planning sudah pasti dari perencanaan, dan yang
        // sudah terlanjur punya target juga berasal dari sana — hanya form
        // Planning yang pernah menyediakan isian itu.
        DB::table('events')
            ->where('status_event', 'Planning')
            ->orWhere('target_omset', '>', 0)
            ->orWhere('target_pax', '>', 0)
            ->update(['dari_planning' => true]);
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('dari_planning');
        });
    }
};
