<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Event;
use App\Models\EventNegosiasi;
use App\Models\Notifikasi;
use App\Support\SlotMeeting;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Negosiasi lanjutan atas penawaran yang diajukan klien sebelum menerimanya.
 *
 * Sebelumnya permintaan penyesuaian hanya dikirim sebagai email ke PIC tanpa
 * meninggalkan catatan, sehingga tidak ada daftar yang bisa ditindaklanjuti dan
 * klien tidak pernah tahu permintaannya sudah ditangani atau belum.
 */
class NegosiasiController extends Controller
{
    use ChecksPegawaiRole;

    /** Banyaknya riwayat yang ditampilkan di bawah antrean. */
    private const RIWAYAT = 30;

    public function index()
    {
        $this->checkEventMarketing();

        $relasi = [
            'event:id_event,nama_event,status_event,tgl_mulai_event,area_event,jumlah_pax,deal_harga_event,id_client,id_pegawai',
            'event.pic:id_pegawai,nama_pegawai',
            'client:id,nama_client,perusahaan_client,email_client',
            // Kolom usulan ikut diperlukan, jadi appointment dimuat utuh.
            'appointment',
            'penangan:id_pegawai,nama_pegawai',
        ];

        // Yang paling lama menunggu didahulukan — ini antrean kerja.
        $menunggu = EventNegosiasi::with($relasi)->menungguTim()
            ->orderBy('created_at')->get()->map(fn ($n) => $this->baris($n));

        // Klien menawar hari lain atas jadwal yang kita usulkan. Dipisahkan
        // sebagai antrean tersendiri: statusnya memang sudah Dijadwalkan, tetapi
        // bila hanya masuk riwayat, permintaan itu tidak akan pernah terlihat
        // sebagai sesuatu yang menunggu keputusan tim.
        $usulan = EventNegosiasi::with($relasi)
            ->where('status', EventNegosiasi::DIJADWALKAN)
            ->whereHas('appointment', fn ($q) => $q->whereNotNull('usulan_tgl'))
            ->orderBy('updated_at')->get()->map(fn ($n) => $this->baris($n));

        $sudahTampil = $menunggu->pluck('id')->merge($usulan->pluck('id'))->all();

        $riwayat = EventNegosiasi::with($relasi)
            ->whereNotIn('id', $sudahTampil)
            ->where('status', '!=', EventNegosiasi::DIAJUKAN)
            ->orderByDesc('updated_at')->take(self::RIWAYAT)
            ->get()->map(fn ($n) => $this->baris($n));

        return Inertia::render('EventMarketing/Negosiasi/Index', [
            'menunggu' => $menunggu->values(),
            'usulan'   => $usulan->values(),
            'riwayat'  => $riwayat->values(),
            'slots'    => SlotMeeting::kerja(),
        ]);
    }

    /**
     * Tim membalas permintaan klien. Bila disertai jadwal pertemuan, sebuah
     * appointment dibuat sekaligus agar slotnya benar-benar terpesan dan tampil
     * pada kalender — bukan sekadar tanggal yang dicatat di negosiasi ini.
     */
    public function balas(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'balasan'      => ['required', 'string', 'min:5', 'max:1000'],
            'jadwalkan'    => ['nullable', 'boolean'],
            'tgl_meeting'  => ['nullable', 'required_if:jadwalkan,true,1', 'date'],
            'jam_meeting'  => ['nullable', 'required_if:jadwalkan,true,1', 'string', 'max:8'],
        ], [
            'balasan.required'     => 'Tuliskan tanggapan untuk klien.',
            'tgl_meeting.required_if' => 'Pilih tanggal pertemuannya.',
            'jam_meeting.required_if' => 'Pilih jam pertemuannya.',
        ]);

        $negosiasi = EventNegosiasi::with('event')->findOrFail($id);

        if ($negosiasi->status !== EventNegosiasi::DIAJUKAN) {
            throw ValidationException::withMessages([
                'balasan' => 'Permintaan ini sudah ditangani (status: ' . $negosiasi->status . ').',
            ]);
        }

        $jadwalkan = $request->boolean('jadwalkan');
        $pegawai   = Auth::guard('pegawai')->id();

        // Slot diperiksa memakai aturan yang sama dengan pemesanan klien:
        // bukan Minggu, di dalam jam kerja, belum dipakai appointment lain, dan
        // tidak bertabrakan dengan jadwal acara yang sedang berjalan.
        if ($jadwalkan) {
            SlotMeeting::periksa($data['tgl_meeting'], $data['jam_meeting'], null, 'tgl_meeting', 'jam_meeting');
        }

        DB::transaction(function () use ($negosiasi, $data, $jadwalkan, $pegawai) {
            $appointment = null;

            if ($jadwalkan) {
                $event = $negosiasi->event;

                // Dibuat berstatus Pending supaya slotnya langsung tertahan.
                // Tanggal usulan ditaruh pada kolom request karena itulah yang
                // dibaca penentu slot selama konfirmasi belum ada.
                $appointment = Appointment::create([
                    'client_id'       => $negosiasi->client_id,
                    'jenis_event'     => $event->kategori_event ?: 'Pembahasan Penawaran',
                    'deskripsi_event' => 'Pembahasan lanjutan penawaran acara "' . $event->nama_event . '".',
                    'tgl_request'     => $data['tgl_meeting'],
                    'jam_request'     => $data['jam_meeting'],
                    'status'          => 'Pending',
                    'catatan_em'      => 'Dijadwalkan dari negosiasi penawaran.',
                    'id_pegawai'      => $pegawai,
                    'id_event'        => $event->id_event,
                ]);
            }

            $negosiasi->update([
                'status'         => $jadwalkan ? EventNegosiasi::DIJADWALKAN : EventNegosiasi::DIJAWAB,
                'balasan'        => trim($data['balasan']),
                'id_appointment' => $appointment?->id,
                'ditangani_oleh' => $pegawai,
                'ditangani_pada' => now(),
            ]);

            $this->jejak($negosiasi->event, $jadwalkan
                ? '💬 Tim membalas negosiasi & menawarkan pertemuan '
                    . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('d M Y')
                    . ' ' . substr($data['jam_meeting'], 0, 5)
                : '💬 Tim membalas negosiasi klien');

            $this->kabariKlien($negosiasi, $jadwalkan, $data);
        });

        return back()->with('success', $jadwalkan
            ? 'Balasan terkirim beserta usulan jadwal pertemuan. Menunggu klien menerimanya.'
            : 'Balasan terkirim ke klien.');
    }

    /** Tutup permintaan yang tidak perlu dilanjutkan. */
    public function tutup(Request $request, $id)
    {
        $this->checkEventMarketing();

        $data = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ], ['alasan.required' => 'Sertakan alasan penutupan agar tercatat.']);

        $negosiasi = EventNegosiasi::with('event')->findOrFail($id);

        if (! in_array($negosiasi->status, EventNegosiasi::BERJALAN, true)) {
            throw ValidationException::withMessages([
                'alasan' => 'Permintaan ini sudah tidak berjalan.',
            ]);
        }

        $negosiasi->update([
            'status'         => EventNegosiasi::DITUTUP,
            'balasan'        => trim($data['alasan']),
            'ditangani_oleh' => Auth::guard('pegawai')->id(),
            'ditangani_pada' => now(),
        ]);

        $this->jejak($negosiasi->event, '💬 Negosiasi ditutup: ' . trim($data['alasan']));

        return back()->with('success', 'Permintaan negosiasi ditutup.');
    }

    /** Catat jejaknya pada catatan acara supaya riwayatnya tetap satu tempat. */
    private function jejak(Event $event, string $teks): void
    {
        $baris = $teks . ' (' . now()->translatedFormat('d M Y H:i') . ')';
        $event->update([
            'note_event' => $event->note_event ? $event->note_event . ' | ' . $baris : $baris,
        ]);
    }

    private function kabariKlien(EventNegosiasi $negosiasi, bool $jadwalkan, array $data): void
    {
        $event = $negosiasi->event;
        $judul = $jadwalkan ? '📅 Usulan Jadwal Pembahasan Penawaran' : '💬 Tanggapan atas Permintaan Anda';

        $pesan = "Tim kami menanggapi permintaan penyesuaian penawaran \"{$event->nama_event}\".\n\n"
               . trim($data['balasan']);

        if ($jadwalkan) {
            $pesan .= "\n\nUsulan jadwal pembahasan: "
                . \Illuminate\Support\Carbon::parse($data['tgl_meeting'])->translatedFormat('l, d F Y')
                . ' pukul ' . substr($data['jam_meeting'], 0, 5)
                . ".\nSilakan buka portal untuk menerima jadwal tersebut.";
        }

        if ($negosiasi->client_id) {
            Notifikasi::create([
                'judul'        => $judul,
                'pesan'        => $pesan,
                'tipe'         => 'negosiasi',
                'reference_id' => $negosiasi->id,
                'client_id'    => $negosiasi->client_id,
                'is_read'      => false,
            ]);
        }

        // Email gagal tidak boleh menggagalkan balasannya — dicatat saja.
        if ($email = $negosiasi->client?->email_client) {
            try {
                Mail::raw($pesan . "\n\n— PT Laksamana Muda Bersatu",
                    fn ($m) => $m->to($email)->subject($judul . ' — Laksamana Muda'));
            } catch (\Exception $e) {
                \Log::warning('Email balasan negosiasi gagal: ' . $e->getMessage());
            }
        }
    }

    /** Bentuk satu baris untuk halaman, termasuk hal yang hanya diketahui model. */
    private function baris(EventNegosiasi $n): array
    {
        $apt = $n->appointment;

        return [
            'id'         => $n->id,
            'id_event'   => $n->id_event,
            'nama_event' => $n->event?->nama_event,
            'status_event' => $n->event?->status_event,
            'nilai'      => (float) ($n->event?->deal_harga_event ?? 0),
            'pax'        => $n->event?->jumlah_pax,
            'area'       => $n->event?->area_event,
            'client'     => $n->client?->perusahaan_client ?: $n->client?->nama_client,
            'client_pic' => $n->client?->nama_client,
            'pic'        => $n->event?->pic?->nama_pegawai,

            'pesan'         => $n->pesan,
            'minta_meeting' => $n->minta_meeting,
            'status'        => $n->status,
            'balasan'       => $n->balasan,

            'diajukan_pada'  => $n->created_at?->translatedFormat('d M Y H:i'),
            'menunggu_sejak' => $n->status === EventNegosiasi::DIAJUKAN
                ? $n->created_at?->diffForHumans(null, true) : null,
            'ditangani_oleh' => $n->penangan?->nama_pegawai,
            'ditangani_pada' => $n->ditangani_pada?->translatedFormat('d M Y H:i'),

            'id_appointment' => $apt?->id,

            'meeting' => $apt?->jadwalBerlaku() ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($apt->jadwalBerlaku()['tgl'])->translatedFormat('d M Y'),
                'jam'     => $apt->jadwalBerlaku()['jam'],
                'status'  => $apt->status,
            ] : null,

            // Klien menawar hari lain. Ditandai di sini supaya tim tidak perlu
            // membuka halaman Appointment satu per satu untuk mengetahuinya.
            'usulan_klien' => filled($apt?->usulan_tgl) ? [
                'tanggal' => \Illuminate\Support\Carbon::parse($apt->usulan_tgl)->translatedFormat('d M Y'),
                'jam'     => substr((string) $apt->usulan_jam, 0, 5),
                'catatan' => $apt->usulan_catatan,
            ] : null,
        ];
    }
}
