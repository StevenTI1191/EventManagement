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

        // ── Closing rate (khusus Event Marketing) ────────────────────────────
        // Klien "ditangani" = klien yang sudah masuk sistem lewat EM ini, baik
        // dari appointment yang ditanganinya maupun dari acara yang ia bawa
        // sampai pipeline (Lead ke atas) — termasuk rencana Planning yang sudah
        // diajukan ke klien. Sebelumnya hanya dari appointment, sehingga klien
        // yang datang lewat jalur Planning tidak pernah ikut terhitung.
        $dariAppointment = \App\Models\Appointment::where('id_pegawai', $id)
            ->whereNotNull('client_id')
            ->distinct()
            ->pluck('client_id');

        // Acara bawaan EM yang sudah menyasar klien (pipeline Lead ke atas).
        $dariPipeline = Event::where('id_pegawai', $id)
            ->whereNotNull('id_client')
            ->whereIn('status_event', [
                Event::STATUS_LEAD, Event::STATUS_NEGOTIATION, Event::STATUS_DEAL,
                Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN, Event::STATUS_DONE,
            ])
            ->distinct()
            ->pluck('id_client');

        $clientIds = $dariAppointment->merge($dariPipeline)->unique()->values();
        $klienDihandle = $clientIds->count();

        // Closing = klien yang acaranya mencapai Deal ke atas DI TANGAN PEGAWAI
        // INI. Lead/Negotiation belum dianggap closing.
        //
        // Penyaringan id_pegawai itu yang menentukan. Tanpanya, pembilangnya
        // menghitung acara SIAPA PUN atas klien tersebut — sehingga seorang
        // Event Marketing yang hanya pernah menangani appointment lalu gagal
        // menutupnya tetap memperoleh angka closing ketika rekannya yang
        // berhasil menutup kesepakatan dengan klien yang sama. Angka yang
        // dipajang sebagai "Closing Rate" pun mengukur capaian orang lain, dan
        // penilaian kinerja yang dibangun di atasnya menjadi keliru.
        $klienClosingIds = $clientIds->isEmpty() ? collect() :
            Event::where('id_pegawai', $id)
                ->whereIn('id_client', $clientIds)
                ->whereIn('status_event', Event::STATUS_BERKOMITMEN)
                ->distinct()->pluck('id_client');

        $klienClosing = $klienClosingIds->count();

        $closingRate = $klienDihandle > 0 ? (int) round($klienClosing / $klienDihandle * 100) : 0;

        // ── Kinerja omset ──────────────────────────────────────────────────────
        // Nilai deal  : nilai kesepakatan event yang sudah terikat komitmen.
        // Uang masuk  : pembayaran yang benar-benar tercatat (lebih konservatif).
        // Target      : akumulasi target_omset yang dipasang saat perencanaan.
        $idEventPic = Event::where('id_pegawai', $id)->pluck('id_event');

        $nilaiDeal = Event::where('id_pegawai', $id)->untukFinance()->sum('deal_harga_event');
        $uangMasuk = $idEventPic->isEmpty() ? 0
            : \App\Models\Transaksi::whereIn('id_event', $idEventPic)->sum('nominal');

        // Target hanya dihitung dari acara yang benar-benar dipasangi target dan
        // tidak dibatalkan, lalu capaiannya diukur dari acara yang sama juga.
        //
        // Sebelumnya target menjumlahkan SELURUH acara milik PIC — termasuk yang
        // batal dan yang tak pernah dipasangi target — sedangkan pembilangnya
        // hanya acara yang sudah terikat komitmen. Dua populasi berbeda itu
        // membuat persentasenya tidak bisa dibaca, dan satu acara dengan target
        // keliru ikut menggelembungkan angkanya selamanya.
        $eventBertarget = Event::where('id_pegawai', $id)
            ->where('target_omset', '>', 0)
            ->where('status_event', '!=', Event::STATUS_BATAL)
            ->get(['id_event', 'target_omset', 'deal_harga_event']);

        $targetOmset     = (float) $eventBertarget->sum('target_omset');
        $realisasiTarget = (float) $eventBertarget->sum('deal_harga_event');

        $stats = [
            'klien_dihandle'      => $klienDihandle,
            'klien_closing'       => $klienClosing,
            'closing_rate'        => $closingRate,
            'total_appointment'   => \App\Models\Appointment::where('id_pegawai', $id)->count(),
            'appointment_selesai' => \App\Models\Appointment::where('id_pegawai', $id)->where('status', 'Selesai')->count(),
            'total_event_pic'     => Event::where('id_pegawai', $id)->count(),
            'nilai_deal'          => (float) $nilaiDeal,
            'uang_masuk'          => (float) $uangMasuk,
            'target_omset'        => $targetOmset,
            'realisasi_target'    => $realisasiTarget,
            // Berapa acara yang menyumbang angka target — supaya nilainya bisa
            // ditelusuri kalau terlihat janggal.
            'event_bertarget'     => $eventBertarget->count(),
            'capaian_target'      => $targetOmset > 0 ? (int) round($realisasiTarget / $targetOmset * 100) : null,
        ];

        // ── Tren 12 bulan terakhir: nilai deal & uang masuk per bulan ─────────
        $tren = [];
        for ($i = 11; $i >= 0; $i--) {
            $bulan = now()->subMonths($i);

            $dealBulan = Event::where('id_pegawai', $id)
                ->untukFinance()
                ->whereYear('tgl_mulai_event', $bulan->year)
                ->whereMonth('tgl_mulai_event', $bulan->month)
                ->sum('deal_harga_event');

            $masukBulan = $idEventPic->isEmpty() ? 0
                : \App\Models\Transaksi::whereIn('id_event', $idEventPic)
                    ->whereYear('tgl_bayar', $bulan->year)
                    ->whereMonth('tgl_bayar', $bulan->month)
                    ->sum('nominal');

            $tren[] = [
                'bulan' => $bulan->translatedFormat('M y'),
                'deal'  => (float) $dealBulan,
                'masuk' => (float) $masukBulan,
            ];
        }

        // ── Sebaran event yang dipegang, per status ───────────────────────────
        $sebaran = Event::where('id_pegawai', $id)
            ->selectRaw('status_event, COUNT(*) as jumlah')
            ->groupBy('status_event')
            ->pluck('jumlah', 'status_event')
            ->map(fn ($j, $s) => ['status' => $s, 'jumlah' => (int) $j])
            ->values();

        // Rincian klien yang ditangani + status closing-nya
        // Banyaknya acara dihitung HANYA dari acara yang dipegang pegawai ini.
        // Memakai seluruh acara milik klien membuat kolomnya menjelaskan
        // kesibukan klien, bukan kontribusi pegawai yang sedang dinilai.
        $acaraPerKlien = $clientIds->isEmpty() ? collect() :
            Event::where('id_pegawai', $id)
                ->whereIn('id_client', $clientIds)
                ->selectRaw('id_client, COUNT(*) AS jumlah')
                ->groupBy('id_client')
                ->pluck('jumlah', 'id_client');

        $clients = \App\Models\Client::whereIn('id', $clientIds)
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'nama_client'       => $c->nama_client,
                'perusahaan_client' => $c->perusahaan_client,
                'events_count'      => (int) ($acaraPerKlien[$c->id] ?? 0),
                // Memakai daftar yang sama persis dengan angka ringkasnya.
                // Sebelumnya penanda ini hanya melihat "klien punya acara",
                // sehingga prospek yang masih Lead maupun kesepakatan yang
                // ditutup rekan lain ikut berlencana "Closing" — dan jumlah
                // baris berlencana itu tidak cocok dengan angka Klien Closing
                // pada layar yang sama.
                'closed'            => $klienClosingIds->contains($c->id),
            ])
            ->sortByDesc('events_count')
            ->values();

        // ── Event tempat pegawai ini ditugaskan sebagai PIC to-do ────────────
        // Berbeda dari "Event sebagai PIC" (yang menghitung event yang ia pegang
        // secara keseluruhan): di sini setiap event tempat ada jobdesk to-do
        // yang ditugaskan kepadanya, beserta rincian tugasnya untuk dropdown.
        $tugasDiassign = Tugas::with('event:id_event,nama_event,tgl_mulai_event,status_event')
            ->where('id_pegawai', $id)
            ->orderBy('kategori')
            ->orderBy('urutan')
            ->get();

        $eventsDiassign = $tugasDiassign
            ->filter(fn ($t) => $t->event)
            ->groupBy('id_event')
            ->map(function ($grup) {
                $ev = $grup->first()->event;
                return [
                    'id_event'    => $ev->id_event,
                    'nama_event'  => $ev->nama_event,
                    'tgl'         => $ev->tgl_mulai_event,
                    'status'      => $ev->status_event,
                    'total'       => $grup->count(),
                    'done'        => $grup->where('status_tugas', 'Done')->count(),
                    'tugas'       => $grup->map(fn ($t) => [
                        'id'       => $t->id_tugas ?? $t->id,
                        'nama'     => $t->nama_tugas,
                        'kategori' => $t->kategori,
                        'status'   => $t->status_tugas,
                        'progress' => (int) $t->progress,
                        'deadline' => $t->deadline_tugas,
                    ])->values(),
                ];
            })->values();

        return Inertia::render('Manajemen/Evaluasi/PegawaiDetail', [
            'pegawai' => $pegawai,
            'events'  => $events,
            'stats'   => $stats,
            'tren'    => $tren,
            'sebaran' => $sebaran,
            'clients' => $clients,
            'eventsDiassign' => $eventsDiassign,
            // Closing rate hanya bermakna bagi Tim Event Marketing internal.
            // Memakai acuan yang sama dengan seluruh pemeriksaan peran lain:
            // posisi pegawai eksternal adalah teks bebas, sehingga membandingkan
            // posisinya saja membuat tenaga lepas berjabatan "Event Marketing"
            // ikut dinilai memakai ukuran yang tidak berlaku baginya.
            'isEM'    => $pegawai->berperan('EventMarketing'),
        ]);
    }

    // Detail evaluasi per event
    public function event($id)
    {
        $this->checkManajemen();

        $event = Event::with(['pic', 'client'])->findOrFail($id);

        // Muat PIC asli tiap tugas (pegawai penanggung jawab jobdesk), bukan hanya
        // PIC event. Urutkan per kategori lalu urutan agar jobdesk terkelompok jelas.
        $tugas = Tugas::with(['event', 'pegawai:id_pegawai,nama_pegawai,posisi_pegawai'])
            ->where('id_event', $id)
            ->orderBy('kategori')
            ->orderBy('urutan')
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
