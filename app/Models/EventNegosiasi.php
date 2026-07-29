<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu putaran negosiasi lanjutan atas penawaran acara.
 *
 * Klien mengajukan penyesuaian sebelum menerima penawaran; tim menjawab, dan
 * bila diperlukan menawarkan jadwal pertemuan untuk membahasnya. Negosiasi yang
 * berulang menghasilkan beberapa baris pada acara yang sama, sehingga urutan
 * barisnya sendiri sudah merupakan riwayat.
 */
class EventNegosiasi extends Model
{
    protected $table = 'event_negosiasi';

    protected $fillable = [
        'id_event', 'client_id', 'pesan', 'minta_meeting', 'status',
        'balasan', 'id_appointment', 'ditangani_oleh', 'ditangani_pada',
    ];

    protected $casts = [
        'minta_meeting'  => 'boolean',
        'ditangani_pada' => 'datetime',
    ];

    public const DIAJUKAN    = 'Diajukan';
    public const DIJAWAB     = 'Dijawab';
    public const DIJADWALKAN = 'Dijadwalkan';
    public const SELESAI     = 'Selesai';
    public const DITUTUP     = 'Ditutup';

    /** Yang masih menunggu tindakan tim. */
    public const PERLU_TIM = [self::DIAJUKAN];

    /** Yang masih menunggu tindakan klien. */
    public const PERLU_KLIEN = [self::DIJADWALKAN];

    /** Belum tuntas — dipakai untuk lencana maupun penjagaan pengajuan ganda. */
    public const BERJALAN = [self::DIAJUKAN, self::DIJAWAB, self::DIJADWALKAN];

    public function scopeMenungguTim($q)
    {
        return $q->where('status', self::DIAJUKAN);
    }

    public function scopeBerjalan($q)
    {
        return $q->whereIn('status', self::BERJALAN);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id', 'id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'id_appointment', 'id');
    }

    public function penangan(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'ditangani_oleh', 'id_pegawai');
    }
}
