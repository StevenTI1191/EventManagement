<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuktiPembayaran extends Model
{
    protected $table = 'bukti_pembayaran';

    protected $fillable = [
        'id_event', 'client_id', 'file_bukti',
        'nominal', 'keterangan', 'status', 'catatan_finance', 'transaksi_id',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function transaksi()
    {
        return $this->belongsTo(Transaksi::class, 'transaksi_id', 'id_transaksi');
    }
}
