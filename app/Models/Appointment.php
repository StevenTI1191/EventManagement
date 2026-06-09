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
        'id_pegawai', 'alasan_batal_client',
    ];

    public function client()
    {
        return $this->belongsTo(\App\Models\Client::class, 'client_id');
    }

    public function pegawai()
    {
        return $this->belongsTo(\App\Models\Pegawai::class, 'id_pegawai', 'id_pegawai');
    }
}
