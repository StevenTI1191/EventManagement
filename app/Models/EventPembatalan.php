<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu pengajuan pembatalan + refund acara. Lihat migrasi event_pembatalan
 * untuk alur tiga pihaknya (Klien → Manajemen → Finance).
 */
class EventPembatalan extends Model
{
    protected $table = 'event_pembatalan';

    protected $fillable = [
        'id_event', 'client_id', 'alasan', 'status', 'catatan_manajemen',
        'disetujui_oleh', 'disetujui_pada', 'refund_nominal', 'diproses_oleh', 'diproses_pada',
    ];

    protected $casts = [
        'disetujui_pada' => 'datetime',
        'diproses_pada'  => 'datetime',
        'refund_nominal' => 'decimal:2',
    ];

    public const STATUS_DIAJUKAN  = 'Diajukan';
    public const STATUS_DISETUJUI = 'Disetujui';
    public const STATUS_DITOLAK   = 'Ditolak';
    public const STATUS_SELESAI   = 'Selesai';

    /** Status yang masih "berjalan" — memblokir pengajuan baru untuk acara sama. */
    public const STATUS_AKTIF = [self::STATUS_DIAJUKAN, self::STATUS_DISETUJUI];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'disetujui_oleh', 'id_pegawai');
    }

    public function pemroses(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'diproses_oleh', 'id_pegawai');
    }

    public function scopeAktif($q)
    {
        return $q->whereIn('status', self::STATUS_AKTIF);
    }
}
