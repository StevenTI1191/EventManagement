<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use Illuminate\Http\Request;

use App\Traits\ChecksPegawaiRole;

class NotifikasiController extends Controller
{
    use ChecksPegawaiRole;
    // Ambil notifikasi untuk EM (hanya tipe 'appointment', bukan notifikasi client/Finance)
    public function index()
    {
        $this->checkEventMarketing();

        $notifikasi = Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->latest()->take(50)->get();
        $unread = Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->where('is_read', false)->count();

        return response()->json([
            'notifikasi' => $notifikasi,
            'unread'     => $unread,
        ]);
    }

    // Tandai semua notifikasi EM (hanya tipe 'appointment') sudah dibaca
    public function markAllRead()
    {
        $this->checkEventMarketing();

        Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->where('is_read', false)
            ->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    // Hapus satu notifikasi EM (pastikan tipe 'appointment' dan bukan notifikasi client)
    public function destroy($id)
    {
        $this->checkEventMarketing();

        Notifikasi::whereNull('client_id')
            ->where('tipe', 'appointment')
            ->where('id', $id)
            ->firstOrFail()
            ->delete();
        return response()->json(['success' => true]);
    }
}
