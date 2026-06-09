<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Index untuk filter event yang sering dipakai di EventController & LaporanController
        Schema::table('events', function (Blueprint $table) {
            $table->index(['tgl_mulai_event', 'status_event'], 'idx_events_tgl_status');
        });

        // Index untuk query notifikasi (dashboard polling & unread count)
        Schema::table('notifikasi', function (Blueprint $table) {
            $table->index(['tipe', 'is_read', 'client_id'], 'idx_notifikasi_tipe_read_client');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('idx_events_tgl_status');
        });

        Schema::table('notifikasi', function (Blueprint $table) {
            $table->dropIndex('idx_notifikasi_tipe_read_client');
        });
    }
};
