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
use App\Traits\ShowsClient;

class ClientViewController extends Controller
{
    use ChecksPegawaiRole, ShowsClient;

    /** Rute yang dipakai halaman klien bersama. */
    private function rute(): array
    {
        return [
            'index'             => 'em.client.index',
            'show'              => 'em.client.show',
            'create'            => 'em.client.create',
            'edit'              => 'em.client.edit',
            'destroy'           => 'em.client.destroy',
            'followUpStore'     => 'em.client.follow-up.store',
            'followUpDestroy'   => 'em.client.follow-up.destroy',
        ];
    }

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        return $this->daftarClient($request, 'EventMarketing/Client/Index', $this->rute(), canEdit: true);
    }

    public function show($id)
    {
        $this->checkEventMarketing();

        return $this->detailClient($id, 'EventMarketing/Client/Show', $this->rute(), canEdit: true);
    }

    /** Tambah satu catatan follow-up untuk client. */
    public function storeFollowUp(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'catatan'        => 'required|string|max:2000',
            // Event yang di-follow-up harus milik client ini
            'id_event'       => ['nullable', 'integer', \Illuminate\Validation\Rule::exists('events', 'id_event')->where('id_client', $id)],
            'tgl_berikutnya' => 'nullable|date|after_or_equal:today',
        ]);

        $client = Client::findOrFail($id);

        $client->followUps()->create([
            'id_pegawai'     => Auth::guard('pegawai')->id(),
            'id_event'       => $data['id_event'] ?? null,
            'catatan'        => $data['catatan'],
            'tgl_berikutnya' => $data['tgl_berikutnya'] ?? null,
        ]);

        $pesan = filled($data['tgl_berikutnya'] ?? null)
            ? 'Catatan follow-up tersimpan. Pengingat dijadwalkan pada ' . \Illuminate\Support\Carbon::parse($data['tgl_berikutnya'])->translatedFormat('d F Y') . '.'
            : 'Catatan follow-up tersimpan.';

        return back()->with('success', $pesan);
    }

    /** Hapus satu catatan follow-up. */
    public function destroyFollowUp($id, $followUpId)
    {
        $this->checkEventMarketing();

        \App\Models\ClientFollowUp::where('id_client', $id)
            ->where('id', $followUpId)
            ->firstOrFail()
            ->delete();

        return back()->with('success', 'Catatan follow-up dihapus.');
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
            'nama_client'        => 'required|string|max:255',
            'perusahaan_client'  => 'nullable|string|max:255',
            'no_telp_client'     => 'nullable|string|max:20',
            'email_client'       => 'nullable|email|unique:clients,email_client',
            'perusahaan_sendiri' => 'nullable|boolean',
        ]);

        // Ditandai "perusahaan sendiri" bila acara diselenggarakan LM sendiri;
        // selain itu klien hasil approach tim EM.
        $sumber = $request->boolean('perusahaan_sendiri')
            ? Client::SUMBER_LM
            : Client::SUMBER_INTERNAL;

        Client::create($request->only([
            'nama_client', 'perusahaan_client', 'no_telp_client', 'email_client',
        ]) + ['sumber' => $sumber]);

        return redirect()->route('em.client.index', ['sumber' => $sumber])
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
