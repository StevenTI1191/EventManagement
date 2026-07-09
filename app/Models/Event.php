<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Event extends Model
{
    protected $table = 'events';
    protected $primaryKey = 'id_event'; // Beritahu Laravel ID-nya bukan 'id' tapi 'id_event'

    protected $fillable = [
        'id_client',
        'id_pegawai',
        'nama_event',
        'kategori_event', // ← tambah ini
        'deskripsi_event',
        'tgl_mulai_event',
        'tgl_selesai_event',
        'jam_mulai',
        'jam_selesai',
        'jam_meeting',
        'jam_keluar_makanan',
        'area_event',
        'jumlah_pax',
        'harga_per_pax',
        'target_pax',
        'target_omset',
        'note_event',
        'food_beverage_event',
        'entairtainment_event',
        'poster_event',
        'kontrak_file',
        'technical_meeting',
        'gladi_resik',
        'status_event',
        'is_public',
        'deal_harga_event',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        // 'id_client' adalah foreign key di tabel events
        return $this->belongsTo(Client::class, 'id_client');
    }

    /**
     * Relasi ke Pegawai (Satu Event punya satu PIC Pegawai)
     */
    public function pic(): BelongsTo
    {
        // 'id_pegawai' adalah foreign key di tabel events
        return $this->belongsTo(Pegawai::class, 'id_pegawai');
    }
    public static function checkBentrok($tgl, $jam_mulai, $jam_selesai, $area, $exclude_id = null): ?self
    {
        $query = self::where('tgl_mulai_event', $tgl)
            ->where('area_event', $area)
            ->where('jam_mulai', '<', $jam_selesai)
            ->where('jam_selesai', '>', $jam_mulai)
            ->where('status_event', '!=', 'Done'); // event yang sudah selesai tidak dihitung bentrok

        if ($exclude_id) {
            $query->where('id_event', '!=', $exclude_id);
        }

        return $query->first();
    }
    public function tugas()
    {
        return $this->hasMany(Tugas::class, 'id_event', 'id_event');
    }
    public function transaksis()
    {
        return $this->hasMany(Transaksi::class, 'id_event', 'id_event');
    }
    public function transaksiItems()
    {
        return $this->hasMany(TransaksiItem::class, 'id_event', 'id_event');
    }
    public function buktiPembayaran()
    {
        return $this->hasMany(BuktiPembayaran::class, 'id_event');
    }
}
