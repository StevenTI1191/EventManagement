<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    // App/Models/Appointment.php
    protected $fillable = [
        'client_id', 'jenis_event', 'deskripsi_event',
        'jumlah_tamu', 'estimasi_budget', 'tgl_request', 'jam_request',
        'tgl_konfirmasi', 'jam_konfirmasi', 'status', 'catatan_em',
        'id_pegawai', 'alasan_batal_client', 'id_event', 'catatan_meeting',
        'usulan_tgl', 'usulan_jam', 'usulan_catatan',
    ];

    /** Status yang masih menempati slot (memegang slot_key). */
    public const STATUS_AKTIF = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    /**
     * Jadwal meeting yang BERLAKU, dalam bentuk SQL agar bisa dipakai query.
     *
     * Begitu tim mengonfirmasi atau menjadwal ulang, jadwal yang berlaku adalah
     * hasil konfirmasi — bukan lagi yang diminta klien. Keduanya harus terisi
     * untuk dipakai; konfirmasi bertanggal tanpa jam (data lama) jatuh kembali ke
     * permintaan semula supaya tidak mencampur tanggal baru dengan jam lama.
     */
    public const SQL_TGL_BERLAKU = '(CASE WHEN tgl_konfirmasi IS NOT NULL AND jam_konfirmasi IS NOT NULL THEN tgl_konfirmasi ELSE tgl_request END)';
    public const SQL_JAM_BERLAKU = '(CASE WHEN tgl_konfirmasi IS NOT NULL AND jam_konfirmasi IS NOT NULL THEN jam_konfirmasi ELSE jam_request END)';

    /** Versi PHP dari aturan di atas: ['tgl' => 'Y-m-d', 'jam' => 'H:i'] atau null. */
    public function jadwalBerlaku(): ?array
    {
        $pakaiKonfirmasi = filled($this->tgl_konfirmasi) && filled($this->jam_konfirmasi);

        $tgl = $pakaiKonfirmasi ? $this->tgl_konfirmasi : $this->tgl_request;
        $jam = $pakaiKonfirmasi ? $this->jam_konfirmasi : $this->jam_request;

        if (blank($tgl) || blank($jam)) {
            return null;
        }

        return [
            'tgl' => $tgl instanceof \DateTimeInterface ? $tgl->format('Y-m-d') : substr((string) $tgl, 0, 10),
            'jam' => substr((string) $jam, 0, 5),
        ];
    }

    /**
     * Jaga slot_key selalu konsisten: appointment aktif memegang kunci unik
     * "tanggal|jam" dari jadwal yang BERLAKU, appointment tak aktif melepasnya
     * (NULL). Unique index pada slot_key-lah yang menutup celah double-booking
     * saat dua permintaan tiba nyaris bersamaan.
     *
     * Dulu kuncinya diambil dari tgl_request/jam_request saja. Akibatnya
     * penjadwalan ulang oleh tim tidak memindahkan slot: jam lama tetap terkunci
     * padahal sudah kosong, dan jam baru tetap terbuka sehingga klien lain bisa
     * memesan waktu yang sama.
     */
    protected static function booted(): void
    {
        static::saving(function (Appointment $a) {
            $jadwal = $a->jadwalBerlaku();

            $a->slot_key = ($jadwal && in_array($a->status, self::STATUS_AKTIF, true))
                ? $jadwal['tgl'] . '|' . $jadwal['jam']
                : null;
        });
    }

    public function client()
    {
        return $this->belongsTo(\App\Models\Client::class, 'client_id');
    }

    public function pegawai()
    {
        return $this->belongsTo(\App\Models\Pegawai::class, 'id_pegawai', 'id_pegawai');
    }

    /** Event yang lahir dari appointment ini (diisi lewat "Buat Event dari Appointment"). */
    public function event()
    {
        return $this->belongsTo(\App\Models\Event::class, 'id_event', 'id_event');
    }
}
