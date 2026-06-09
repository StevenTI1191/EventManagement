<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::guard('pegawai')->user()->posisi_pegawai !== 'Finance') {
            abort(403);
        }

        $request->validate([
            'tgl_awal'   => 'nullable|date',
            'tgl_akhir'  => 'nullable|date|after_or_equal:tgl_awal',
            'kategori'   => 'nullable|string|max:255',
            'id_client'  => 'nullable|integer|min:1',
            'id_pegawai' => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        $query = Event::with(['client', 'pic', 'tugas']);

        if ($request->tgl_awal && $request->tgl_akhir) {
            $query->whereBetween('tgl_mulai_event', [$request->tgl_awal, $request->tgl_akhir]);
        }
        if ($request->kategori) {
            $query->where('kategori_event', $request->kategori);
        }
        if ($request->id_client) {
            $query->where('id_client', $request->id_client);
        }
        if ($request->id_pegawai) {
            $query->where('id_pegawai', $request->id_pegawai);
        }
        if ($request->search) {
            $query->where('nama_event', 'like', '%' . $request->search . '%');
        }

        $events = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Finance/Event/Index', [
            'events'   => $events,
            'filters'  => $request->only(['tgl_awal', 'tgl_akhir', 'kategori', 'id_client', 'id_pegawai', 'search']),
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function jadwal()
    {
        if (Auth::guard('pegawai')->user()->posisi_pegawai !== 'Finance') {
            abort(403);
        }

        // Filter ±1 tahun dari sekarang — mencegah load seluruh tabel events ke memori
        $events = Event::select(['id_event', 'nama_event', 'tgl_mulai_event', 'status_event', 'jam_mulai'])
            ->whereBetween('tgl_mulai_event', [
                now()->subYear()->startOfYear()->toDateString(),
                now()->addYear()->endOfYear()->toDateString(),
            ])
            ->orderBy('tgl_mulai_event')
            ->get()
            ->map(function ($event) {
                return [
                    'id'     => $event->id_event,
                    'title'  => $event->nama_event,
                    'start'  => $event->tgl_mulai_event,
                    'status' => $event->status_event,
                    'time'   => $event->jam_mulai,
                ];
            });

        return Inertia::render('Finance/JadwalAcara', [
            'events' => $events,
        ]);
    }
}
