<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransaksiItem extends Model
{
    protected $table = 'transaksi_items';
    protected $primaryKey = 'id_item';

    protected $fillable = [
        'id_event',
        'tipe',
        'nama_item',
        'qty',
        'harga',
        'total',
        'keterangan',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }
}
