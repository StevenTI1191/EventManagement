<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class ClientController extends Controller
{
    use ChecksPegawaiRole;

    public function index(Request $request)
    {
        $this->checkFinance();

        $query = Client::withCount('events');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_client', 'like', '%' . $request->search . '%')
                  ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%')
                  ->orWhere('email_client', 'like', '%' . $request->search . '%');
            });
        }

        $clients = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Finance/Client/Index', [
            'clients' => $clients,
            'filters' => $request->only('search'),
        ]);
    }

    public function show($id)
    {
        $this->checkFinance();

        $client = Client::findOrFail($id);

        // Validasi input filter sebelum dipakai di query
        request()->validate([
            'tgl_awal'  => 'nullable|date',
            'tgl_akhir' => 'nullable|date|after_or_equal:tgl_awal',
            'search'    => 'nullable|string|max:255',
            'pic'       => 'nullable|integer|min:1',
            'kategori'  => 'nullable|string|max:255',
        ]);

        $query = Event::with('pic')->where('id_client', $id);

        if (request('tgl_awal') && request('tgl_akhir')) {
            $query->whereBetween('tgl_mulai_event', [request('tgl_awal'), request('tgl_akhir')]);
        }
        if (request('kategori')) {
            $query->where('kategori_event', request('kategori'));
        }
        if (request('pic')) {
            $query->where('id_pegawai', request('pic'));
        }
        if (request('search')) {
            $query->where('nama_event', 'like', '%' . request('search') . '%');
        }

        $events   = $query->latest('tgl_mulai_event')->take(200)->get();
        $pics     = Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get();
        // Scope ke client ini — jangan expose kategori event milik client lain
        $kategoris = Event::where('id_client', $id)->distinct()->pluck('kategori_event')->filter()->values();

        return Inertia::render('Finance/Client/Show', [
            'client'    => $client,
            'events'    => $events,
            'pics'      => $pics,
            'kategoris' => $kategoris,
            'filters'   => request()->only(['tgl_awal', 'tgl_akhir', 'kategori', 'pic', 'search']),
        ]);
    }
}
