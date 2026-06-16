<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Seragamkan status event jadi hanya: Upcoming / Done.
        // Semua selain 'Done' (Pending/Active/Cancelled/NULL) → 'Upcoming'.
        DB::statement("UPDATE events SET status_event = 'Upcoming' WHERE status_event IS NULL OR status_event <> 'Done'");

        Schema::table('events', function (Blueprint $table) {
            $table->string('status_event')->default('Upcoming')->change();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('status_event')->default('Pending')->change();
        });
    }
};
