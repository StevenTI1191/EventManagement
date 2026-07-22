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
     * Jaga slot_key selalu konsisten: appointment aktif memegang kunci unik
     * "tanggal|jam" dari slot yang dimintanya, appointment tak aktif melepasnya
     * (NULL). Unique index pada slot_key-lah yang menutup celah double-booking
     * saat dua permintaan tiba nyaris bersamaan.
     */
    protected static function booted(): void
    {
        static::saving(function (Appointment $a) {
            if (in_array($a->status, self::STATUS_AKTIF, true) && $a->tgl_request && $a->jam_request) {
                $tgl = $a->tgl_request instanceof \DateTimeInterface
                    ? $a->tgl_request->format('Y-m-d')
                    : substr((string) $a->tgl_request, 0, 10);
                $a->slot_key = $tgl . '|' . substr((string) $a->jam_request, 0, 5);
            } else {
                $a->slot_key = null;
            }
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
