<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notifikasi extends Model
{
    protected $table = 'notifikasi';

    protected $fillable = [
        'judul',
        'pesan',
        'tipe',
        'reference_id',
        'client_id',
        'is_read',
    ];
}
