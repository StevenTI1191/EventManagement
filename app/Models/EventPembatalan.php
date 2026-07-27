<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Catatan pembatalan acara oleh klien.
 *
 * Sejak aturan uang muka hangus berlaku, pembatalan tidak lagi melewati
 * persetujuan siapa pun: klien menekannya setelah diberi peringatan tegas, dan
 * acaranya langsung berstatus Batal. Baris di tabel ini murni riwayat — siapa
 * membatalkan, kapan, dengan alasan apa, dan berapa uang yang hangus — bukan
 * antrean yang perlu ditinjau.
 *
 * Klien yang tidak ingin uang mukanya hangus dapat mengajukan GANTI TANGGAL
 * (lihat EventReschedule), dan itulah satu-satunya jalur yang masih memerlukan
 * persetujuan, yaitu dari Pihak Manajemen.
 */
class EventPembatalan extends Model
{
    protected $table = 'event_pembatalan';

    protected $fillable = [
        'id_event', 'client_id', 'alasan',
        'dp_hangus', 'status', 'diproses_pada',
    ];

    protected $casts = [
        'diproses_pada' => 'datetime',
        'dp_hangus'     => 'decimal:2',
    ];

    /** Satu-satunya status yang dipakai sekarang: pembatalan selalu final. */
    public const STATUS_SELESAI = 'Selesai';

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
