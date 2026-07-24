<?php

namespace App\Http\Controllers\Backstage;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;

/**
 * Menyediakan daftar jadwal yang sudah terpakai pada satu area & tanggal,
 * agar form buat/edit acara bisa menampilkan bentrok secara langsung
 * (tanpa menunggu tombol simpan). Dipakai bersama semua peran backstage.
 */
class JadwalController extends Controller
{
    public function terpakai(Request $request)
    {
        $data = $request->validate([
            'area'    => 'required|string|max:255',
            'tgl'     => 'required|date',
            'exclude' => 'nullable|integer',
        ]);

        $tgl = \Illuminate\Support\Carbon::parse($data['tgl'])->toDateString();

        $events = Event::where('area_event', $data['area'])
            ->whereNotIn('status_event', [Event::STATUS_DONE, Event::STATUS_BATAL])
            ->whereDate('tgl_mulai_event', '<=', $tgl)
            ->whereRaw('COALESCE(tgl_selesai_event, tgl_mulai_event) >= ?', [$tgl])
            ->when(! empty($data['exclude']), fn ($q) => $q->where('id_event', '!=', $data['exclude']))
            ->orderBy('jam_mulai')
            ->get(['id_event', 'nama_event', 'jam_mulai', 'jam_selesai', 'loading_in', 'loading_out']);

        return response()->json([
            'terpakai' => $events->map(fn ($e) => [
                'nama'          => $e->nama_event,
                'mulai'         => substr((string) ($e->loading_in ?: $e->jam_mulai), 0, 5),
                'selesai'       => substr((string) ($e->loading_out ?: $e->jam_selesai), 0, 5),
                'pakai_loading' => (bool) $e->loading_in,
            ])->all(),
        ]);
    }
}
