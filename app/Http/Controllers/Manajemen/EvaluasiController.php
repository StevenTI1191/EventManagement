<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Pegawai;
use App\Models\Event;
use App\Models\Tugas;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;

class EvaluasiController extends Controller
{
    use ChecksPegawaiRole;
    // Halaman utama: list pegawai + list event
    public function index(Request $request)
    {
        $this->checkManajemen();

        $pegawais = Pegawai::withCount('events')
            ->where('posisi_pegawai', '!=', 'Manajemen')
            ->get()
            ->each(function ($pegawai) {
                // Hitung total tugas dari semua event milik pegawai ini
                $pegawai->total_tugas = Tugas::whereIn(
                    'id_event',
                    \App\Models\Event::where('id_pegawai', $pegawai->id_pegawai)->pluck('id_event')
                )->count();
            });

        $query = Event::with(['client', 'pic'])
            ->withCount(['tugas', 'tugas as tugas_done_count' => function($q) {
                $q->where('status_tugas', 'Done');
            }]);

        if ($request->status) {
            $query->where('status_event', $request->status);
        }

        if ($request->search) {
            $query->where('nama_event', 'like', '%' . $request->search . '%');
        }

        $events = $query->latest('tgl_mulai_event')->paginate(6)->withQueryString();

        return Inertia::render('Manajemen/Evaluasi/Index', [
            'pegawais' => $pegawais,
            'events' => $events,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    // Detail evaluasi per pegawai
    public function pegawai($id)
    {
        $this->checkManajemen();

        $pegawai = Pegawai::findOrFail($id);

        $events = Event::with(['tugas', 'client'])
            ->where('id_pegawai', $id)
            ->latest('tgl_mulai_event')
            ->take(200)
            ->get();

        // Statistik closing rate (khusus Event Marketing) — dipindah dari Manajemen Pegawai.
        // Klien yang ditangani EM ini lewat appointment (id_pegawai di-set saat konfirmasi/batal)
        $clientIds = \App\Models\Appointment::where('id_pegawai', $id)
            ->whereNotNull('client_id')
            ->distinct()
            ->pluck('client_id');

        $klienDihandle = $clientIds->count();

        // Klien dari appointment yang akhirnya memiliki event = closing (deal terjadi)
        $klienClosing = $clientIds->isEmpty() ? 0 :
            Event::whereIn('id_client', $clientIds)->distinct()->pluck('id_client')->count();

        $closingRate = $klienDihandle > 0 ? (int) round($klienClosing / $klienDihandle * 100) : 0;

        $stats = [
            'klien_dihandle'      => $klienDihandle,
            'klien_closing'       => $klienClosing,
            'closing_rate'        => $closingRate,
            'total_appointment'   => \App\Models\Appointment::where('id_pegawai', $id)->count(),
            'appointment_selesai' => \App\Models\Appointment::where('id_pegawai', $id)->where('status', 'Selesai')->count(),
            'total_event_pic'     => Event::where('id_pegawai', $id)->count(),
        ];

        // Rincian klien yang ditangani + status closing-nya
        $clients = \App\Models\Client::whereIn('id', $clientIds)
            ->withCount('events')
            ->orderByDesc('events_count')
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'nama_client'       => $c->nama_client,
                'perusahaan_client' => $c->perusahaan_client,
                'events_count'      => $c->events_count,
                'closed'            => $c->events_count > 0,
            ]);

        return Inertia::render('Manajemen/Evaluasi/PegawaiDetail', [
            'pegawai' => $pegawai,
            'events'  => $events,
            'stats'   => $stats,
            'clients' => $clients,
            'isEM'    => in_array($pegawai->posisi_pegawai, ['EventMarketing', 'Event Marketing']),
        ]);
    }

    // Detail evaluasi per event
    public function event($id)
    {
        $this->checkManajemen();

        $event = Event::with(['pic', 'client'])->findOrFail($id);

        $tugas = Tugas::with('event')
            ->where('id_event', $id)
            ->latest()
            ->take(500)
            ->get();

        return Inertia::render('Manajemen/Evaluasi/EventDetail', [
            'event' => $event,
            'tugas' => $tugas,
        ]);
    }
   public function updateRehire(Request $request, $id)
    {
        $this->checkManajemen();

        $request->validate([
            'rekomendasi_rehire' => 'required|in:Yes,No',
        ]);

        \App\Models\Pegawai::findOrFail($id)->update([
            'rekomendasi_rehire' => $request->rekomendasi_rehire,
        ]);

        return back()->with('success', 'Status rehire berhasil diupdate.');
    }
}
