<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        // Portfolio — event Done terbaru (hanya yang Publik)
        $portfolio = Event::where('status_event', 'Done')
            ->where('is_public', true)
            ->latest('tgl_mulai_event')
            ->take(6)
            ->get(['id_event', 'nama_event', 'kategori_event', 'tgl_mulai_event', 'poster_event', 'status_event', 'area_event']);

        // Upcoming events — urut terdekat (hanya yang Publik)
        $upcoming = Event::where('status_event', 'Upcoming')
            ->where('is_public', true)
            ->orderBy('tgl_mulai_event', 'asc')
            ->take(4)
            ->get(['id_event', 'nama_event', 'kategori_event', 'tgl_mulai_event', 'jam_mulai', 'jam_selesai', 'area_event', 'poster_event', 'status_event', 'jumlah_pax']);

        // Stats real dari DB
        $stats = [
            'totalEventDone' => Event::where('status_event', 'Done')->count(),
            'totalClient'    => Client::count(),
            'totalEvent'     => Event::count(),
            'totalKategori'  => Event::distinct()->whereNotNull('kategori_event')->count('kategori_event'),
        ];

        return Inertia::render('Client/Home', [
            'portfolio'  => $portfolio,
            'upcoming'   => $upcoming,
            'stats'      => $stats,
            'isLoggedIn' => auth('client')->check(),
            'auth'       => ['user' => auth('client')->user()],
        ]);
    }

    public function events(Request $request)
    {
        $request->validate([
            'search'   => 'nullable|string|max:255',
            'kategori' => 'nullable|string|max:255',
            'status'   => 'nullable|in:Upcoming,Done',
        ]);

        // Hanya event Publik yang boleh tampil di listing publik
        $query = Event::whereNotNull('status_event')->where('is_public', true);

        if ($request->filled('search')) {
            $query->where('nama_event', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('kategori')) {
            $query->where('kategori_event', $request->kategori);
        }
        if ($request->filled('status')) {
            $query->where('status_event', $request->status);
        }

        $events = $query->latest('tgl_mulai_event')
            ->paginate(12, ['id_event', 'nama_event', 'kategori_event', 'tgl_mulai_event',
                             'jam_mulai', 'jam_selesai', 'area_event', 'jumlah_pax',
                             'poster_event', 'status_event', 'deskripsi_event',
                             'entairtainment_event', 'food_beverage_event'])
            ->withQueryString();

        $kategoris = Event::whereNotNull('kategori_event')
            ->distinct()->pluck('kategori_event');

        return Inertia::render('Client/Events', [
            'events'     => $events,
            'kategoris'  => $kategoris,
            'filters'    => $request->only(['search', 'kategori', 'status']),
            'isLoggedIn' => auth('client')->check(),
            'auth'       => ['user' => auth('client')->user()],
        ]);
    }
}
