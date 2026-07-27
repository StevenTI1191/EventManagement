<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengajuan GANTI TANGGAL acara dari klien — jalan keluar agar uang mukanya
 * tidak hangus ketika acara tidak jadi diselenggarakan pada tanggal semula.
 *
 * Berbeda dari pembatalan yang berlaku seketika, pemindahan jadwal harus
 * disetujui Pihak Manajemen lebih dulu karena menyangkut ketersediaan venue:
 * tanggal yang diminta bisa saja sudah dipakai acara lain.
 */
class EventReschedule extends Model
{
    protected $table = 'event_reschedule';

    protected $fillable = [
        'id_event', 'client_id',
        'tgl_lama', 'tgl_baru', 'tgl_selesai_baru', 'alasan',
        'status', 'manajemen_oleh', 'manajemen_pada', 'catatan_tolak',
    ];

    protected $casts = [
        'tgl_lama'         => 'date',
        'tgl_baru'         => 'date',
        'tgl_selesai_baru' => 'date',
        'manajemen_pada'   => 'datetime',
    ];

    public const STATUS_DIAJUKAN  = 'Diajukan';
    public const STATUS_DISETUJUI = 'Disetujui';
    public const STATUS_DITOLAK   = 'Ditolak';

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
        return $this->belongsTo(Pegawai::class, 'manajemen_oleh', 'id_pegawai');
    }

    /** Pengajuan yang masih menunggu keputusan — memblokir pengajuan baru. */
    public function scopeMenunggu($q)
    {
        return $q->where('status', self::STATUS_DIAJUKAN);
    }
}
