<?php

namespace App\Traits;

use App\Models\Client;
use App\Models\Event;
use App\Models\Pegawai;
use App\Support\Wa;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Data klien yang dipakai bersama Event Marketing, Manajemen, dan Finance.
 *
 * Finance sebelumnya punya versi sendiri yang lebih dangkal: tanpa pemisahan
 * sumber klien dan tanpa riwayat follow-up, sehingga melihat klien yang sama
 * memberi gambaran berbeda tergantung siapa yang membukanya.
 *
 * Wewenangnya dipisah lewat $canEdit, bukan lewat halaman berbeda — Finance
 * melihat isi yang sama persis, hanya tanpa tombol ubah, hapus, dan catat
 * follow-up.
 */
trait ShowsClient
{
    protected function daftarClient(Request $request, string $komponen, array $routes, bool $canEdit): Response
    {
        $sumber = in_array($request->sumber, Client::SEMUA_SUMBER, true)
            ? $request->sumber
            : Client::SUMBER_MANDIRI;

        $query = Client::withCount('events')->where('sumber', $sumber);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_client', 'like', '%' . $request->search . '%')
                  ->orWhere('perusahaan_client', 'like', '%' . $request->search . '%')
                  ->orWhere('email_client', 'like', '%' . $request->search . '%');
            });
        }

        return Inertia::render($komponen, [
            'clients' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only('search', 'sumber'),
            'sumber'  => $sumber,
            'jumlah'  => [
                Client::SUMBER_MANDIRI  => Client::mandiri()->count(),
                Client::SUMBER_INTERNAL => Client::internal()->count(),
            ],
            'canEdit' => $canEdit,
            'routes'  => $routes,
        ]);
    }

    protected function detailClient($id, string $komponen, array $routes, bool $canEdit): Response
    {
        request()->validate([
            'tgl_awal'  => 'nullable|date',
            'tgl_akhir' => 'nullable|date|after_or_equal:tgl_awal',
            'search'    => 'nullable|string|max:255',
            'pic'       => 'nullable|integer|min:1',
            'kategori'  => 'nullable|string|max:255',
        ]);

        $client = Client::findOrFail($id);

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

        return Inertia::render($komponen, [
            'client'    => $client,
            'events'    => $query->latest('tgl_mulai_event')->take(200)->get(),
            'pics'      => Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')
                ->orderBy('nama_pegawai')->get(),
            // Dibatasi ke klien ini — jangan bocorkan kategori milik klien lain.
            'kategoris' => Event::where('id_client', $id)->distinct()
                ->pluck('kategori_event')->filter()->values(),
            'followUps' => $client->followUps()
                ->with(['pegawai:id_pegawai,nama_pegawai', 'event:id_event,nama_event,status_event'])
                ->latest()->take(100)->get(),
            'waFollowUp' => Wa::link(
                $client->no_telp_client,
                "Halo {$client->nama_client}, dari tim Laksamana Muda. "
                    . 'Kami ingin menindaklanjuti kebutuhan acara Anda. Apakah ada yang bisa kami bantu?',
            ),
            'filters'   => request()->only(['tgl_awal', 'tgl_akhir', 'kategori', 'pic', 'search']),
            'canEdit'   => $canEdit,
            'routes'    => $routes,
        ]);
    }
}
