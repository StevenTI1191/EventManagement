<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Index status — dipakai di filter controller & state machine query (whereIn status).
        // Index tgl_request — dipakai untuk filter tanggal di dashboard appointment.
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('status', 'idx_appointments_status');
            $table->index('tgl_request', 'idx_appointments_tgl_request');
        });

        // Index created_at — dipakai saat pruning token expired (DELETE WHERE created_at < now()).
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->index('created_at', 'idx_prt_created_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('idx_appointments_status');
            $table->dropIndex('idx_appointments_tgl_request');
        });

        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->dropIndex('idx_prt_created_at');
        });
    }
};
