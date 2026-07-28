<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

/**
 * Antrean penawaran yang menunggu keputusan Pihak Manajemen.
 *
 * Persetujuannya sendiri sudah lama bisa dilakukan dari papan Pipeline, tetapi
 * tombolnya berada di dalam kartu prospek — Manajemen harus tahu kartu mana
 * yang perlu dibuka. Halaman ini menyajikan antreannya sebagai daftar
 * tersendiri, lengkap dengan sejak kapan menunggu dan apa saja yang masih
 * kurang, supaya tidak ada penawaran yang tertahan hanya karena tak terlihat.
 *
 * Aksi setujui/tolak memakai rute yang sama dengan papan Pipeline
 * (manajemen.penawaran.setujui / .tolak) agar aturannya hanya ada satu tempat.
 */
class PersetujuanPenawaranController extends Controller
{
    use ChecksPegawaiRole;

    /** Banyaknya keputusan terakhir yang ditampilkan sebagai riwayat. */
    private const RIWAYAT = 20;

    public function index()
    {
        $this->checkManajemen();

        $kolom = [
            'id_event', 'nama_event', 'kategori_event', 'status_event', 'tipe_event',
            'tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai',
            'area_event', 'jumlah_pax', 'deal_harga_event', 'id_client', 'id_pegawai',
            'penawaran_status', 'penawaran_diajukan_oleh', 'penawaran_diajukan_pada',
            'penawaran_ditinjau_oleh', 'penawaran_ditinjau_pada', 'penawaran_catatan',
        ];

        $relasi = [
            'client:id,nama_client,perusahaan_client,email_client,no_telp_client',
            'pic:id_pegawai,nama_pegawai,posisi_pegawai',
            'penawaranDiajukanOleh:id_pegawai,nama_pegawai',
            'penawaranDitinjauOleh:id_pegawai,nama_pegawai',
        ];

        // Yang paling lama menunggu didahulukan — antrean, bukan tumpukan.
        $menunggu = Event::eksternal()
            ->penawaranMenunggu()
            ->where('status_event', '!=', Event::STATUS_BATAL)
            ->with($relasi)
            ->select($kolom)
            ->orderBy('penawaran_diajukan_pada')
            ->get()
            ->map(fn (Event $e) => $this->baris($e, true));

        $riwayat = Event::eksternal()
            ->whereIn('penawaran_status', [Event::PENAWARAN_DISETUJUI, Event::PENAWARAN_DITOLAK])
            ->with($relasi)
            ->select($kolom)
            ->orderByDesc('penawaran_ditinjau_pada')
            ->take(self::RIWAYAT)
            ->get()
            ->map(fn (Event $e) => $this->baris($e, false));

        return Inertia::render('Manajemen/Penawaran/Index', [
            'menunggu' => $menunggu->values(),
            'riwayat'  => $riwayat->values(),
        ]);
    }

    /** Bentuk satu baris antrean, termasuk hal-hal yang hanya diketahui model. */
    private function baris(Event $e, bool $antre): array
    {
        return [
            'id_event'    => $e->id_event,
            'nama_event'  => $e->nama_event,
            'kategori'    => $e->kategori_event,
            'status'      => $e->status_event,
            'area'        => $e->area_event,
            'pax'         => $e->jumlah_pax,
            'nilai'       => (float) ($e->deal_harga_event ?? 0),
            'tgl_acara'   => filled($e->tgl_mulai_event)
                ? Carbon::parse($e->tgl_mulai_event)->translatedFormat('d M Y')
                : null,
            'jam'         => $e->jam_mulai && $e->jam_selesai
                ? substr($e->jam_mulai, 0, 5) . ' – ' . substr($e->jam_selesai, 0, 5)
                : null,

            'client'      => $e->client?->perusahaan_client ?: $e->client?->nama_client,
            'client_pic'  => $e->client?->nama_client,
            'punya_email' => filled($e->client?->email_client),
            'pic'         => $e->pic?->nama_pegawai,

            'status_penawaran' => $e->penawaran_status,
            'catatan'          => $e->penawaran_catatan,

            'diajukan_oleh' => $e->penawaranDiajukanOleh?->nama_pegawai,
            'diajukan_pada' => $e->penawaran_diajukan_pada?->translatedFormat('d M Y H:i'),
            // Sudah berapa lama menunggu — inilah yang membuat penawaran
            // tertahan menjadi kelihatan tanpa perlu menghitung tanggal sendiri.
            'menunggu_sejak' => $antre
                ? $e->penawaran_diajukan_pada?->diffForHumans(null, true)
                : null,

            'ditinjau_oleh' => $e->penawaranDitinjauOleh?->nama_pegawai,
            'ditinjau_pada' => $e->penawaran_ditinjau_pada?->translatedFormat('d M Y H:i'),

            // Diperiksa di sini juga, bukan hanya saat tombol ditekan, supaya
            // Manajemen tahu lebih dulu penawaran mana yang belum bisa disetujui.
            'kelengkapan' => $antre ? $e->kelengkapan() : [],
        ];
    }
}
