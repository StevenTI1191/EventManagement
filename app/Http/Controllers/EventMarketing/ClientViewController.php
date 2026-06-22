<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Traits\ChecksPegawaiRole;

class ClientViewController extends Controller
{
    use ChecksPegawaiRole;

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        $query = Client::withCount('events');

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('nama_client', 'like', '%' . $request->search . '%')
                  ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%')
                  ->orWhere('email_client', 'like', '%' . $request->search . '%');
            });
        }

        $clients = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('EventMarketing/Client/Index', [
            'clients' => $clients,
            'filters' => $request->only('search'),
        ]);
    }

    public function show($id)
    {
        $this->checkEventMarketing();

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

        $events = $query->latest('tgl_mulai_event')->take(200)->get();
        $pics = Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get();
        // Scope ke client ini — jangan expose kategori event milik client lain
        $kategoris = Event::where('id_client', $id)->distinct()->pluck('kategori_event')->filter()->values();

        return Inertia::render('EventMarketing/Client/Show', [
            'client'   => $client,
            'events'   => $events,
            'pics'     => $pics,
            'kategoris' => $kategoris,
            'filters'  => request()->only(['tgl_awal', 'tgl_akhir', 'kategori', 'pic', 'search']),
        ]);
    }

    public function create()
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Client/Create');
    }

    public function store(Request $request)
    {
        $this->checkEventMarketing();

        $request->validate([
            'nama_client'       => 'required|string|max:255',
            'perusahaan_client' => 'nullable|string|max:255',
            'no_telp_client'    => 'nullable|string|max:20',
            'email_client'      => 'nullable|email|unique:clients,email_client',
        ]);

        Client::create($request->only([
            'nama_client', 'perusahaan_client', 'no_telp_client', 'email_client',
        ]));

        return redirect()->route('em.client.index')
            ->with('success', 'Client berhasil ditambahkan.');
    }

    public function edit($id)
    {
        $this->checkEventMarketing();

        $client = Client::findOrFail($id);

        return Inertia::render('EventMarketing/Client/Edit', [
            'client' => $client,
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkEventMarketing();

        $client = Client::findOrFail($id);

        $request->validate([
            'nama_client'       => 'required|string|max:255',
            'perusahaan_client' => 'nullable|string|max:255',
            'no_telp_client'    => 'nullable|string|max:20',
            'email_client'      => 'nullable|email|unique:clients,email_client,' . $client->id,
        ]);

        $client->update($request->only([
            'nama_client', 'perusahaan_client', 'no_telp_client', 'email_client',
        ]));

        return redirect()->route('em.client.index')
            ->with('success', 'Client berhasil diupdate.');
    }

    public function destroy($id)
    {
        $this->checkEventMarketing();

        $client = Client::withCount('events')->findOrFail($id);

        // Blokir penghapusan jika client masih punya event (cascade akan menghapus
        // semua event, transaksi, tugas, bukti, dan appointment milik mereka).
        if ($client->events_count > 0) {
            return redirect()->route('em.client.index')
                ->with('error', "Client \"{$client->nama_client}\" tidak bisa dihapus karena masih memiliki {$client->events_count} event terkait. Hapus event terlebih dahulu.");
        }

        $client->delete();

        return redirect()->route('em.client.index')
            ->with('success', 'Client berhasil dihapus.');
    }
}
