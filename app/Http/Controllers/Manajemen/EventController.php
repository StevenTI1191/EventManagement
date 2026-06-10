<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Traits\ChecksPegawaiRole;

class EventController extends Controller
{
    use ChecksPegawaiRole;
    public function index(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'tgl_awal'   => 'nullable|date',
            'tgl_akhir'  => 'nullable|date|after_or_equal:tgl_awal',
            'status'     => 'nullable|in:Pending,Active,Done,Cancelled',
            'id_client'  => 'nullable|integer|min:1',
            'id_pegawai' => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        $query = Event::query();

        if ($request->tgl_awal && $request->tgl_akhir) {
            $query->whereBetween('tgl_mulai_event', [$request->tgl_awal, $request->tgl_akhir]);
        }
        if ($request->status) {
            $query->where('status_event', $request->status);
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

        $events = $query->with(['client', 'pic', 'tugas'])->latest()->paginate(15)->withQueryString();

        return Inertia::render('Manajemen/Event/Index', [
            'events'   => $events,
            'filters'  => $request->only(['tgl_awal', 'tgl_akhir', 'status', 'id_client', 'id_pegawai', 'search']),
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function create()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Event/Create', [
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'nama_event'        => 'required|string|max:255',
            'id_client'         => 'required|exists:clients,id',
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'required|string|max:8',
            'jam_selesai'       => 'required|string|max:8',
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            'status_event'      => 'nullable|in:Pending,Active,Done,Cancelled',
            'poster_event'      => 'nullable|file|image|max:2048',
            'kontrak_file'      => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        // --- CEK BENTROK ---
        $bentrok = Event::checkBentrok(
            $request->tgl_mulai_event,
            $request->jam_mulai,
            $request->jam_selesai,
            $request->area_event
        );

        if ($bentrok) {
            return back()->withErrors([
                'bentrok' => "Jadwal bentrok dengan event \"{$bentrok->nama_event}\"
                            ({$bentrok->jam_mulai} - {$bentrok->jam_selesai})
                            di area {$bentrok->area_event}
                            pada tanggal {$bentrok->tgl_mulai_event}."
            ])->withInput();
        }

        $data = $request->only([
            'nama_event', 'id_client', 'id_pegawai', 'kategori_event', 'deskripsi_event',
            'tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai',
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
        ]);

        if (empty($data['deal_harga_event'])) {
            $data['deal_harga_event'] = 0;
        }

        // --- SIMPAN POSTER (public — memang untuk dilihat umum) ---
        if ($request->hasFile('poster_event') && $request->file('poster_event')->isValid()) {
            $file = $request->file('poster_event');
            $filename = $file->hashName();
            $destinationPath = public_path('posters');
            if (!file_exists($destinationPath)) mkdir($destinationPath, 0755, true);
            $file->move($destinationPath, $filename);
            $data['poster_event'] = 'posters/' . $filename;
        }

        // --- SIMPAN KONTRAK FILE (private — dokumen sensitif) ---
        if ($request->hasFile('kontrak_file') && $request->file('kontrak_file')->isValid()) {
            $file = $request->file('kontrak_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('kontrak', $file, $filename);
            $data['kontrak_file'] = $filename;
        }

        Event::create($data);

        return redirect()->route('manajemen.event.index');
    }

    public function edit($id)
    {
        $this->checkManajemen();

        $event = Event::findOrFail($id);

        return Inertia::render('Manajemen/Event/Edit', [
            'event'    => $event,
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkManajemen();

        $event = Event::findOrFail($id);

        $request->validate([
            'nama_event'        => 'required|string|max:255',
            'id_client'         => 'required|exists:clients,id',
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'required|string|max:8',
            'jam_selesai'       => 'required|string|max:8',
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            'status_event'      => 'nullable|in:Pending,Active,Done,Cancelled',
            'poster_event'      => 'nullable|file|image|max:2048',
            'kontrak_file'      => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        // --- CEK BENTROK (exclude event yang sedang diedit) ---
        $bentrok = Event::checkBentrok(
            $request->tgl_mulai_event,
            $request->jam_mulai,
            $request->jam_selesai,
            $request->area_event,
            $id
        );

        if ($bentrok) {
            return back()->withErrors([
                'bentrok' => "Jadwal bentrok dengan event \"{$bentrok->nama_event}\"
                            ({$bentrok->jam_mulai} - {$bentrok->jam_selesai})
                            di area {$bentrok->area_event}
                            pada tanggal {$bentrok->tgl_mulai_event}."
            ])->withInput();
        }

        $data = $request->only([
            'nama_event', 'id_client', 'id_pegawai', 'kategori_event', 'deskripsi_event',
            'tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai',
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
        ]);

        if (empty($data['deal_harga_event'])) {
            $data['deal_harga_event'] = 0;
        }

        // --- UPDATE POSTER ---
        if ($request->hasFile('poster_event') && $request->file('poster_event')->isValid()) {
            if ($event->poster_event) {
                $oldPath = public_path($event->poster_event);
                $safePosterDir = realpath(public_path('posters'));
                $resolvedOld   = realpath($oldPath);
                if ($safePosterDir && $resolvedOld && str_starts_with($resolvedOld, $safePosterDir)) {
                    @unlink($resolvedOld);
                }
            }
            $file = $request->file('poster_event');
            $filename = $file->hashName();
            $destinationPath = public_path('posters');
            if (!file_exists($destinationPath)) mkdir($destinationPath, 0755, true);
            $file->move($destinationPath, $filename);
            $data['poster_event'] = 'posters/' . $filename;
        }

        // --- UPDATE KONTRAK FILE (private storage) ---
        if ($request->hasFile('kontrak_file') && $request->file('kontrak_file')->isValid()) {
            if ($event->kontrak_file) {
                Storage::disk('local')->delete('kontrak/' . $event->kontrak_file);
            }
            $file = $request->file('kontrak_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('kontrak', $file, $filename);
            $data['kontrak_file'] = $filename;
        }

        $event->update($data);

        return redirect()->route('manajemen.event.index');
    }

    public function destroy($id)
    {
        $this->checkManajemen();

        $event = Event::findOrFail($id);

        // Hapus poster (public) — validasi path dulu
        if ($event->poster_event) {
            $safePosterDir = realpath(public_path('posters'));
            $resolvedPoster = realpath(public_path($event->poster_event));
            if ($safePosterDir && $resolvedPoster && str_starts_with($resolvedPoster, $safePosterDir)) {
                @unlink($resolvedPoster);
            }
        }

        // Hapus kontrak (private storage)
        if ($event->kontrak_file) {
            Storage::disk('local')->delete('kontrak/' . $event->kontrak_file);
        }

        $event->delete();
        return redirect()->route('manajemen.event.index');
    }

    public function jadwal()
    {
        $this->checkManajemen();

        // Filter ±1 tahun dari sekarang — mencegah load seluruh tabel events ke memori
        $events = Event::select(['id_event', 'nama_event', 'tgl_mulai_event', 'status_event', 'jam_mulai'])
            ->whereBetween('tgl_mulai_event', [
                now()->subYear()->startOfYear()->toDateString(),
                now()->addYear()->endOfYear()->toDateString(),
            ])
            ->orderBy('tgl_mulai_event')
            ->get()
            ->map(function($event) {
                return [
                    'id'     => $event->id_event,
                    'title'  => $event->nama_event,
                    'start'  => $event->tgl_mulai_event,
                    'status' => $event->status_event,
                    'time'   => $event->jam_mulai,
                ];
            });

        return Inertia::render('Manajemen/JadwalAcara', [
            'events' => $events
        ]);
    }
}
