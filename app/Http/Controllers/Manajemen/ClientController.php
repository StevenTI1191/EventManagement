<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class ClientController extends Controller
{
    use ChecksPegawaiRole;
    public function index(Request $request)
    {
        $this->checkManajemen();

        $query = Client::withCount('events'); // ← ubah dari Client::query()

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('nama_client', 'like', '%' . $request->search . '%')
                ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%')
                ->orWhere('email_client', 'like', '%' . $request->search . '%');
            });
        }

        $clients = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Manajemen/Client/ClientIndex', [
            'clients' => $clients,
            'filters' => $request->only('search'),
        ]);
    }

    public function show($id)
    {
        $this->checkManajemen();

        $client = Client::findOrFail($id);

        // Validasi input filter sebelum dipakai di query (mencegah Carbon::parse exception & DB error)
        request()->validate([
            'tgl_awal'  => 'nullable|date',
            'tgl_akhir' => 'nullable|date|after_or_equal:tgl_awal',
            'search'    => 'nullable|string|max:255',
            'pic'       => 'nullable|integer|min:1',
            'kategori'  => 'nullable|string|max:255',
        ]);

        $query = \App\Models\Event::with(['pic', 'client'])
            ->where('id_client', $id);

        // Filter tanggal
        if (request('tgl_awal') && request('tgl_akhir')) {
            $query->whereBetween('tgl_mulai_event', [request('tgl_awal'), request('tgl_akhir')]);
        }

        // Filter kategori
        if (request('kategori')) {
            $query->where('kategori_event', request('kategori'));
        }

        // Filter PIC
        if (request('pic')) {
            $query->where('id_pegawai', request('pic'));
        }

        // Search
        if (request('search')) {
            $query->where('nama_event', 'like', '%' . request('search') . '%');
        }

        $events = $query->latest('tgl_mulai_event')->take(200)->get();

        $pics = \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->orderBy('nama_pegawai')->get();
        // Scope ke client ini — jangan expose kategori event milik client lain
        $kategoris = \App\Models\Event::where('id_client', $id)->distinct()->pluck('kategori_event')->filter()->values();

        return Inertia::render('Manajemen/Client/Show', [
            'client' => $client,
            'events' => $events,
            'pics' => $pics,
            'kategoris' => $kategoris,
            'filters' => request()->only(['tgl_awal', 'tgl_akhir', 'kategori', 'pic', 'search']),
        ]);
    }

    public function create()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Client/Create');
    }

    public function store(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'nama_client'       => 'required|string|max:255',
            'perusahaan_client' => 'nullable|string|max:255',
            'no_telp_client'    => 'nullable|string|max:20',
            'email_client'      => 'nullable|email|unique:clients,email_client',
        ]);

        Client::create($request->only([
            'nama_client', 'perusahaan_client', 'no_telp_client', 'email_client',
        ]));

        return redirect()->route('manajemen.client.index')
            ->with('success', 'Client berhasil ditambahkan.');
    }

    public function edit($id)
    {
        $this->checkManajemen();

        $client = Client::findOrFail($id);

        return Inertia::render('Manajemen/Client/Edit', [
            'client' => $client,
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkManajemen();

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

        return redirect()->route('manajemen.client.index')
            ->with('success', 'Client berhasil diupdate.');
    }

    public function destroy($id)
    {
        $this->checkManajemen();

        $client = Client::withCount('events')->findOrFail($id);

        // Blokir penghapusan jika client masih memiliki event terkait.
        // Menghapus client akan cascade-delete SEMUA event, transaksi,
        // tugas, bukti pembayaran, dan appointment milik mereka.
        if ($client->events_count > 0) {
            return redirect()->route('manajemen.client.index')
                ->with('error', "Client \"{$client->nama_client}\" tidak bisa dihapus karena masih memiliki {$client->events_count} event terkait. Hapus event terlebih dahulu.");
        }

        $client->delete();

        return redirect()->route('manajemen.client.index')
            ->with('success', 'Client berhasil dihapus.');
    }
}
