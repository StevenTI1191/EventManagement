<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Support\UnggahGambar;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesDokumentasi;
use App\Traits\ShowsEventDetail;
use App\Traits\ShowsRiwayatEvent;
use App\Traits\ShowsSemuaEvent;

class EventController extends Controller
{
    use ChecksPegawaiRole, ShowsEventDetail, ShowsRiwayatEvent, ShowsSemuaEvent, ManagesDokumentasi;

    protected function checkDokumentasiAkses(): void
    {
        $this->checkManajemen();
    }

    /** Seluruh siklus acara Lead sampai Done dalam satu tabel. */
    public function semua(Request $request)
    {
        $this->checkManajemen();

        return $this->halamanSemuaEvent('Manajemen/Event/Semua', $request, [
            'detail' => 'manajemen.event.show',
            'self'   => 'manajemen.event.semua',
            'prefix' => 'manajemen',
        ]);
    }

    /** Riwayat event yang sudah pernah dijalankan, target vs hasilnya. */
    public function riwayat(Request $request)
    {
        $this->checkManajemen();

        return $this->halamanRiwayatEvent('Manajemen/Event/Riwayat', $request, [
            'index'  => 'manajemen.event.index',
            'detail' => 'manajemen.event.show',
            'self'   => 'manajemen.event.riwayat',
            'prefix' => 'manajemen',
        ]);
    }

    /** Halaman detail satu event — termasuk event yang masih di pipeline. */
    public function show($id)
    {
        $this->checkManajemen();

        return $this->halamanDetailEvent('Manajemen/Event/Detail', $id, [
            'update'   => 'manajemen.event.update',
            'destroy'  => 'manajemen.event.destroy',
            'index'    => 'manajemen.event.index',
            'pipeline' => 'manajemen.pipeline.index',
            // Manajemen belum punya endpoint follow-up sendiri; tombol catat
            // follow-up disembunyikan bila route ini kosong.
            'followUp' => null,
            'todo'     => 'manajemen.todo.index',
            'client'   => 'manajemen.client.show',
            'dokumentasiStore'   => 'manajemen.event.dokumentasi.store',
            'dokumentasiDestroy' => 'manajemen.event.dokumentasi.destroy',
        ]);
    }

    public function index(Request $request)
    {
        $this->checkManajemen();

        $request->validate([
            'tgl_awal'   => 'nullable|date',
            'tgl_akhir'  => 'nullable|date|after_or_equal:tgl_awal',
            'status'     => 'nullable|in:Upcoming,Penyelesaian,Done',
            'kategori'   => 'nullable|string|max:255',
            'id_client'  => 'nullable|integer|min:1',
            'id_pegawai' => 'nullable|integer|min:1',
            'search'     => 'nullable|string|max:255',
        ]);

        // Hanya event nyata (Upcoming/Done). Planning & pipeline (Lead/Negotiation/Deal)
        // punya halamannya sendiri, jadi tidak ditampilkan di daftar Event.
        $query = Event::query()->sedangBerjalan();

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

        return Inertia::render('Manajemen/Event/Index', [
            'events'   => $events,
            'filters'  => $request->only(['tgl_awal', 'tgl_akhir', 'status', 'kategori', 'id_client', 'id_pegawai', 'search']),
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
            'harga_per_pax'     => 'nullable|numeric|min:0|max:9999999999999',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => ['required', 'string', 'max:8', Event::ATURAN_JAM],
            'jam_selesai'       => ['required', 'string', 'max:8', Event::ATURAN_JAM],
            'loading_in'        => ['nullable', 'string', 'max:8', Event::ATURAN_JAM],
            'loading_out'       => ['nullable', 'string', 'max:8', Event::ATURAN_JAM],
            'area_event'        => 'required|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            // Acara baru selalu lahir sebagai acara berjalan — lihat
            // Event::statusFormYangBoleh(). Formulir tambahnya memang tidak
            // punya pemilih status; nilainya dipatok Upcoming.
            'status_event'      => ['nullable', Rule::in(Event::statusFormYangBoleh())],
            'is_public'         => 'nullable|boolean',
            'poster_event'      => UnggahGambar::aturan(maksKb: 10240),
        ]);

        // --- CEK BENTROK ---
        $bentrok = Event::checkBentrok(
            $request->tgl_mulai_event,
            $request->jam_mulai,
            $request->jam_selesai,
            $request->area_event,
            null,
            $request->tgl_selesai_event,
            $request->loading_in,
            $request->loading_out
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
            'loading_in', 'loading_out',
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax', 'harga_per_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
        ]);

        $data['is_public'] = $request->boolean('is_public');

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

        // Event baru dari klien selalu masuk pipeline pada tahap Lead.
        // Naik ke Negotiation/Deal lewat papan Pipeline; menjadi Upcoming hanya
        // setelah DP 50% diverifikasi Finance.
        $data['status_event'] = Event::STATUS_LEAD;
        $data['tipe_event']   = Event::TIPE_EKSTERNAL;

        $event = Event::create($data);

        // Prospek baru lahir sebagai Lead, dan daftar Event menyaring event
        // terkonfirmasi saja — mengarah ke sana membuat event yang baru dibuat
        // seolah lenyap. Antar langsung ke halaman detailnya untuk dilengkapi.
        return redirect()->route('manajemen.event.show', $event->id_event)
            ->with('success', 'Prospek baru dibuat di tahap Lead. Lengkapi detailnya untuk bisa naik ke Negotiation.');
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

        // Event yang belum berjalan boleh disimpan setengah jadi — lihat catatan
        // lengkap di EventController EM.
        $belumJalan = in_array($event->status_event, [Event::STATUS_PLANNING, ...Event::PIPELINE_STATUSES], true);
        $jadwal     = $belumJalan ? 'nullable' : 'required';

        $request->validate([
            'nama_event'        => 'required|string|max:255',
            // Event internal (acara milik LMB sendiri) memang tidak punya klien.
            'id_client'         => [$event->tipe_event === Event::TIPE_EKSTERNAL ? 'required' : 'nullable', 'exists:clients,id'],
            'id_pegawai'        => 'required|exists:pegawais,id_pegawai',
            'kategori_event'    => 'nullable|string|max:255',
            'jumlah_pax'        => 'nullable|integer|min:0|max:100000',
            'harga_per_pax'     => 'nullable|numeric|min:0|max:9999999999999',
            'deal_harga_event'  => 'nullable|numeric|min:0|max:9999999999999',
            'target_pax'        => 'nullable|integer|min:0|max:100000',
            'target_omset'      => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_mulai_event'   => 'required|date',
            'tgl_selesai_event' => 'nullable|date|after_or_equal:tgl_mulai_event',
            'jam_mulai'         => [$jadwal, 'string', 'max:8', Event::ATURAN_JAM],
            'jam_selesai'       => [$jadwal, 'string', 'max:8', Event::ATURAN_JAM],
            'loading_in'        => ['nullable', 'string', 'max:8', Event::ATURAN_JAM],
            'loading_out'       => ['nullable', 'string', 'max:8', Event::ATURAN_JAM],
            'area_event'        => $jadwal . '|string|max:255',
            'technical_meeting' => 'nullable|string|max:255',
            'gladi_resik'       => 'nullable|string|max:255',
            // Hanya status yang benar-benar boleh ditetapkan dari formulir.
            // Pembatalan dan perpindahan tahap pipeline punya jalurnya sendiri
            // yang ikut membersihkan antrean turunannya — lihat
            // Event::statusFormYangBoleh().
            'status_event'      => ['nullable', Rule::in(Event::statusFormYangBoleh($event))],
            'is_public'         => 'nullable|boolean',
            'poster_event'      => UnggahGambar::aturan(maksKb: 10240),
        ]);

        // --- CEK BENTROK (exclude event yang sedang diedit) ---
        // Hanya bila jadwalnya sudah utuh; event pipeline yang baru terisi
        // sebagian belum bisa dibandingkan.
        if ($request->filled(['tgl_mulai_event', 'jam_mulai', 'jam_selesai', 'area_event'])) {
            // Formulir yang tidak menyertakan kolom loading — mis. panel sunting
            // pada halaman detail acara — tetap harus diperiksa memakai rentang
            // loading yang TERSIMPAN. Tanpa cadangan ini, pemeriksaannya jatuh ke
            // jam acara saja sehingga rentangnya lebih sempit daripada rentang
            // yang sebenarnya ditempati acara itu, dan jadwal yang bentrok bisa
            // lolos tersimpan.
            $loadingIn  = $request->input('loading_in',  $event->loading_in);
            $loadingOut = $request->input('loading_out', $event->loading_out);

            $bentrok = Event::checkBentrok(
                $request->tgl_mulai_event,
                $request->jam_mulai,
                $request->jam_selesai,
                $request->area_event,
                $id,
                $request->tgl_selesai_event,
                $loadingIn,
                $loadingOut
            );

            if ($bentrok) {
                return back()->withErrors([
                    'bentrok' => "Jadwal bentrok dengan event \"{$bentrok->nama_event}\"
                                ({$bentrok->jam_mulai} - {$bentrok->jam_selesai})
                                di area {$bentrok->area_event}
                                pada tanggal {$bentrok->tgl_mulai_event}."
                ])->withInput();
            }
        }

        $data = $request->only([
            'nama_event', 'id_client', 'id_pegawai', 'kategori_event', 'deskripsi_event',
            'tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai',
            'loading_in', 'loading_out',
            'jam_meeting', 'jam_keluar_makanan', 'area_event', 'jumlah_pax', 'harga_per_pax',
            'note_event', 'food_beverage_event', 'entairtainment_event',
            'technical_meeting', 'gladi_resik', 'deal_harga_event', 'status_event',
            // Target tetap bisa dilihat & disunting setelah tahap Planning lewat.
            'target_pax', 'target_omset',
        ]);

        $data['is_public'] = $request->boolean('is_public');

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

        // Status event yang masih Planning atau di pipeline HANYA boleh diubah
        // lewat jalurnya sendiri — lihat catatan di EventController EM.
        if (in_array($event->status_event, [Event::STATUS_PLANNING, ...Event::PIPELINE_STATUSES], true)) {
            unset($data['status_event']);
        }

        // Target pax & omset milik tahap perencanaan. Prospek yang di-input
        // langsung tidak pernah melewatinya, jadi nilainya tidak diterima
        // walaupun ikut terkirim dari form yang sudah usang.
        if (! $event->bolehPunyaTarget()) {
            unset($data['target_pax'], $data['target_omset']);
        }

        $event->update($data);

        // Kembali ke halaman detail — daftar Event menyaring event terkonfirmasi
        // saja, jadi event pipeline akan terlihat "hilang" setelah disimpan.
        // Penanda asal ikut dibawa supaya tombol kembali tetap pulang ke papan
        // Pipeline setelah menyimpan.
        return redirect()->route('manajemen.event.show', $this->tujuanDetail($request, $event))
            ->with('success', 'Detail event tersimpan.');
    }

    public function destroy($id)
    {
        $this->checkManajemen();

        $event = Event::findOrFail($id);

        // Pembersihan berkas (poster, dokumentasi, bukti pembayaran & transaksi)
        // ditangani hook deleting di model Event, agar berlaku lewat jalur
        // penghapusan mana pun dan tidak tertinggal di salah satu peran.
        $event->delete();

        return redirect()->route('manajemen.event.index');
    }

    public function jadwal()
    {
        $this->checkManajemen();

        // Filter ±1 tahun dari sekarang — mencegah load seluruh tabel events ke memori
        $daftarEvent = Event::with(['client:id,nama_client', 'pic:id_pegawai,nama_pegawai'])
            ->select(['id_event', 'nama_event', 'tgl_mulai_event', 'tgl_selesai_event', 'status_event',
                      'jam_mulai', 'jam_selesai', 'poster_event', 'area_event', 'kategori_event',
                      'technical_meeting', 'gladi_resik',
                      'jumlah_pax', 'deal_harga_event', 'id_client', 'id_pegawai'])
            ->whereBetween('tgl_mulai_event', [
                now()->subYear()->startOfYear()->toDateString(),
                now()->addYear()->endOfYear()->toDateString(),
            ])
            ->whereNotIn('status_event', ['Planning', Event::STATUS_BATAL])
            ->orderBy('tgl_mulai_event')
            ->get();

        $persiapan = \App\Support\JadwalPersiapan::dari($daftarEvent);

        $events = $daftarEvent
            ->map(function($event) {
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

        return Inertia::render('Manajemen/JadwalAcara', [
            // Technical meeting & gladi resik jadi entri sendiri — keduanya
            // sering jatuh sebelum hari acara.
            'events' => $events->concat($appointments)->concat($persiapan)->values(),
        ]);
    }
}
