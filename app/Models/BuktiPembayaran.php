<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuktiPembayaran extends Model
{
    protected $table = 'bukti_pembayaran';

    protected $fillable = [
        'id_event', 'id_invoice', 'client_id', 'file_bukti',
        'nominal', 'keterangan', 'status', 'catatan_finance', 'transaksi_id',
        'ocr_nominal', 'ocr_status', 'ocr_teks',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event');
    }

    /** Tagihan yang dibayar oleh bukti ini. */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'id_invoice', 'id_invoice');
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
