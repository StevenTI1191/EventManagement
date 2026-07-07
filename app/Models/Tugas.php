<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tugas extends Model
{
    protected $table = 'tugas';
    protected $primaryKey = 'id_tugas';

    protected $fillable = [
        'id_event',
        'nama_tugas',
        'kategori',
        'timeline',
        'id_pegawai',
        'deskripsi_tugas',
        'catatan_tugas',
        'deadline_tugas',
        'status_tugas',
        'progress',
        'urutan',
    ];

    protected $casts = [
        'progress' => 'integer',
        'urutan'   => 'integer',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function pegawai()
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai', 'id_pegawai');
    }
}
