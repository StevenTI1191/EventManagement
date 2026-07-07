<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Mail\EventDibuat;
use App\Models\Client;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class EventController extends Controller
{
    use ChecksPegawaiRole;
    public function index(Request $request)
    {
        $this->checkEventMarketing();

        $request->validate([
            'tgl_awal'   => 'nullable|date',
            'tgl_akhir'  => 'nullable|date|after_or_equal:tgl_awal',
            'status'     => 'nullable|in:Upcoming,Done',
            'kategori'   => 'nullable|string|max:255',
            'id_client'  => 'nullable|integer|min:1',
            'id_pegawai' => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        $query = Event::query()->where('status_event', '!=', 'Planning');

        if ($request->tgl_awal && $request->tgl_akhir) {
            $query->whereBetween('tgl_mulai_event', [$request->tgl_awal, $request->tgl_akhir]);
        }
        if ($request->status) {
            $query->where('status_event', $request->status);
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

        $events = $query->with(['client', 'pic', 'tugas'])->latest()->paginate(15)->withQueryString();

        return Inertia::render('EventMarketing/Event/Index', [
            'events'   => $events,
            'filters'  => $request->only(['tgl_awal', 'tgl_akhir', 'status', 'kategori', 'id_client', 'id_pegawai', 'search']),
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function create()
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Event/Create', [
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->checkEventMarketing();

        $request->validate([
            'nama_event'        => 'required|string|max:255',
            'id_client'         => 'required|exists:clients,id',
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'harga_per_pax'     => 'nullable|numeric|min:0|max:9999999999999',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'required|string|max:8',
            'jam_selesai'       => 'required|string|max:8',
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            'status_event'      => 'nullable|in:Upcoming,Done',
            'is_public'         => 'nullable|boolean',
            'poster_event'      => 'nullable|file|image|max:10240',
            'kontrak_file'      => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

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
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax', 'harga_per_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
        ]);

        $data['is_public'] = $request->boolean('is_public');

        if (empty($data['deal_harga_event'])) {
            $data['deal_harga_event'] = 0;
        }

        if ($request->hasFile('poster_event') && $request->file('poster_event')->isValid()) {
            $file = $request->file('poster_event');
            $filename = $file->hashName();
            $destinationPath = public_path('posters');
            if (!file_exists($destinationPath)) mkdir($destinationPath, 0755, true);
            $file->move($destinationPath, $filename);
            $data['poster_event'] = 'posters/' . $filename;
        }

        if ($request->hasFile('kontrak_file') && $request->file('kontrak_file')->isValid()) {
            $file = $request->file('kontrak_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('kontrak', $file, $filename);
            $data['kontrak_file'] = $filename;
        }

        $event = Event::create($data);

        // Kirim email ke client saat event baru dikonfirmasi
        $client = Client::find($event->id_client);
        if ($client?->email_client) {
            try {
                $event->load('client');
                Mail::to($client->email_client)->send(new EventDibuat($event));
            } catch (\Exception $e) {
                \Log::warning('Email event dibuat gagal: ' . $e->getMessage());
            }
        }

        return redirect()->route('em.event.index');
    }

    public function edit($id)
    {
        $this->checkEventMarketing();

        $event = Event::findOrFail($id);

        return Inertia::render('EventMarketing/Event/Edit', [
            'event'    => $event,
            'clients'  => \App\Models\Client::select('id', 'nama_client', 'perusahaan_client')->get(),
            'pegawais' => \App\Models\Pegawai::select('id_pegawai', 'nama_pegawai', 'posisi_pegawai')->get(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->checkEventMarketing();

        $event = Event::findOrFail($id);

        $request->validate([
            'nama_event'        => 'required|string|max:255',
            'id_client'         => 'required|exists:clients,id',
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'harga_per_pax'     => 'nullable|numeric|min:0|max:9999999999999',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => 'required|string|max:8',
            'jam_selesai'       => 'required|string|max:8',
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            'status_event'      => 'nullable|in:Upcoming,Done',
            'is_public'         => 'nullable|boolean',
            'poster_event'      => 'nullable|file|image|max:10240',
            'kontrak_file'      => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

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
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax', 'harga_per_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
        ]);

        $data['is_public'] = $request->boolean('is_public');

        if (empty($data['deal_harga_event'])) {
            $data['deal_harga_event'] = 0;
        }

        if ($request->hasFile('poster_event') && $request->file('poster_event')->isValid()) {
            if ($event->poster_event) {
                $safePosterDir  = realpath(public_path('posters'));
                $resolvedPoster = realpath(public_path($event->poster_event));
                if ($safePosterDir && $resolvedPoster && str_starts_with($resolvedPoster, $safePosterDir)) {
                    @unlink($resolvedPoster);
                }
            }
            $file = $request->file('poster_event');
            $filename = $file->hashName();
            $destinationPath = public_path('posters');
            if (!file_exists($destinationPath)) mkdir($destinationPath, 0755, true);
            $file->move($destinationPath, $filename);
            $data['poster_event'] = 'posters/' . $filename;
        }

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

        return redirect()->route('em.event.index');
    }

    public function destroy($id)
    {
        $this->checkEventMarketing();

        $event = Event::findOrFail($id);

        if ($event->poster_event) {
            $safePosterDir  = realpath(public_path('posters'));
            $resolvedPoster = realpath(public_path($event->poster_event));
            if ($safePosterDir && $resolvedPoster && str_starts_with($resolvedPoster, $safePosterDir)) {
                @unlink($resolvedPoster);
            }
        }
        if ($event->kontrak_file) {
            Storage::disk('local')->delete('kontrak/' . $event->kontrak_file);
        }

        $event->delete();
        return redirect()->route('em.event.index');
    }

    // ← TAMBAH METHOD INI
    public function jadwal()
    {
        $this->checkEventMarketing();

        // Filter ±1 tahun dari sekarang — mencegah load seluruh tabel events ke memori
        $events = Event::with(['client:id,nama_client', 'pic:id_pegawai,nama_pegawai'])
            ->select(['id_event', 'nama_event', 'tgl_mulai_event', 'tgl_selesai_event', 'status_event',
                      'jam_mulai', 'jam_selesai', 'poster_event', 'area_event', 'kategori_event',
                      'jumlah_pax', 'deal_harga_event', 'id_client', 'id_pegawai'])
            ->whereBetween('tgl_mulai_event', [
                now()->subYear()->startOfYear()->toDateString(),
                now()->addYear()->endOfYear()->toDateString(),
            ])
            ->where('status_event', '!=', 'Planning')
            ->orderBy('tgl_mulai_event')
            ->get()
            ->map(function ($event) {
                return [
                    'id'          => $event->id_event,
                    'type'        => 'event',
                    'title'       => $event->nama_event,
                    'start'       => $event->tgl_mulai_event,
                    'status'      => $event->status_event,
                    'time'        => $event->jam_mulai,
                    'jam_selesai' => $event->jam_selesai,
                    'poster'      => $event->poster_event,
                    'area'        => $event->area_event,
                    'kategori'    => $event->kategori_event,
                    'jumlah_pax'  => $event->jumlah_pax,
                    'deal_harga'  => $event->deal_harga_event,
                    'client'      => $event->client?->nama_client,
                    'pic'         => $event->pic?->nama_pegawai,
                ];
            });

        // Appointment yang sudah dikonfirmasi / reschedule ikut tampil di kalender
        $appointments = \App\Models\Appointment::with(['client:id,nama_client', 'pegawai:id_pegawai,nama_pegawai'])
            ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
            ->get()
            ->map(function ($a) {
                $tgl = $a->tgl_konfirmasi ?: $a->tgl_request;
                return [
                    'id'          => 'apt-' . $a->id,
                    'type'        => 'appointment',
                    'title'       => $a->jenis_event ?: 'Meeting',
                    'start'       => $tgl ? \Illuminate\Support\Carbon::parse($tgl)->toDateString() : null,
                    'status'      => $a->status,
                    'time'        => $a->jam_konfirmasi ?: $a->jam_request,
                    'client'      => $a->client?->nama_client,
                    'pic'         => $a->pegawai?->nama_pegawai,
                    'jumlah_tamu' => $a->jumlah_tamu,
                    'deskripsi'   => $a->deskripsi_event,
                ];
            })
            ->filter(fn ($a) => $a['start'])
            ->values();

        return Inertia::render('EventMarketing/JadwalAcara', [
            'events' => $events->concat($appointments)->values(),
        ]);
    }
}
