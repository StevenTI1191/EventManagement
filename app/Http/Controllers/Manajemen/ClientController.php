<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ShowsClient;

class ClientController extends Controller
{
    use ChecksPegawaiRole;
    // Halaman daftar & detail klien memakai komponen bersama Klien/Index dan
    // Klien/Show, sama seperti Event Marketing dan Finance. Sebelumnya
    // Manajemen menyalin sendiri controller maupun halamannya, dan salinan itu
    // tertinggal: kolom Kontrak beserta tombol unduhnya masih ada di sini
    // padahal sudah dilepas dari komponen bersama, dan pemisahan sumber klien
    // ditulis ulang dengan cara yang berbeda.
    use ShowsClient;

    /**
     * Nama rute yang dipakai komponen bersama.
     *
     * Rute follow-up sengaja TIDAK disertakan: mencatat tindak lanjut klien
     * adalah wewenang Event Marketing. Manajemen tetap membaca riwayatnya,
     * hanya tidak menambah maupun menghapusnya.
     */
    private function rute(): array
    {
        return [
            'index'   => 'manajemen.client.index',
            'show'    => 'manajemen.client.show',
            'create'  => 'manajemen.client.create',
            'edit'    => 'manajemen.client.edit',
            'destroy' => 'manajemen.client.destroy',
        ];
    }

    public function index(Request $request)
    {
        $this->checkManajemen();

        return $this->daftarClient($request, 'Manajemen/Client/ClientIndex', $this->rute(), canEdit: true);
    }

    public function show($id)
    {
        $this->checkManajemen();

        return $this->detailClient($id, 'Manajemen/Client/Show', $this->rute(), canEdit: true);
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

        // Client yang di-input tim internal = hasil approach sendiri (bukan daftar mandiri).
        Client::create($request->only([
            'nama_client', 'perusahaan_client', 'no_telp_client', 'email_client',
        ]) + ['sumber' => Client::SUMBER_INTERNAL]);

        return redirect()->route('manajemen.client.index', ['sumber' => Client::SUMBER_INTERNAL])
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
