<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu pengajuan pembatalan + refund acara. Alur persetujuan BERURUTAN tiga
 * pihak: Klien mengajukan → Event Marketing menyetujui → Finance menyetujui
 * sekaligus menetapkan nominal refund → Manajemen menyetujui terakhir (refund
 * diproses & acara jadi Batal). Ditolak oleh salah satu pihak menghentikan alur.
 */
class EventPembatalan extends Model
{
    protected $table = 'event_pembatalan';

    protected $fillable = [
        'id_event', 'client_id', 'alasan', 'status',
        'em_oleh', 'em_pada',
        'finance_oleh', 'finance_pada', 'refund_nominal',
        'manajemen_oleh', 'manajemen_pada',
        'catatan_manajemen', 'catatan_tolak', 'ditolak_peran',
        'disetujui_oleh', 'disetujui_pada', 'diproses_oleh', 'diproses_pada',
    ];

    protected $casts = [
        'em_pada'        => 'datetime',
        'finance_pada'   => 'datetime',
        'manajemen_pada' => 'datetime',
        'diproses_pada'  => 'datetime',
        'refund_nominal' => 'decimal:2',
    ];

    public const STATUS_DIAJUKAN     = 'Diajukan';          // menunggu Event Marketing
    public const STATUS_DISETUJUI_EM = 'Disetujui EM';      // menunggu Finance
    public const STATUS_DISETUJUI_FIN = 'Disetujui Finance'; // menunggu Manajemen
    public const STATUS_SELESAI      = 'Selesai';
    public const STATUS_DITOLAK      = 'Ditolak';

    /** Status yang masih berjalan — memblokir pengajuan baru untuk acara sama. */
    public const STATUS_AKTIF = [self::STATUS_DIAJUKAN, self::STATUS_DISETUJUI_EM, self::STATUS_DISETUJUI_FIN];

    /** Peran yang gilirannya menyetujui pada status tertentu. */
    public static function giliran(string $status): ?string
    {
        return match ($status) {
            self::STATUS_DIAJUKAN      => 'EventMarketing',
            self::STATUS_DISETUJUI_EM  => 'Finance',
            self::STATUS_DISETUJUI_FIN => 'Manajemen',
            default                    => null,
        };
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function penyetujuEm(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'em_oleh', 'id_pegawai');
    }

    public function penyetujuFinance(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'finance_oleh', 'id_pegawai');
    }

    public function penyetujuManajemen(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'manajemen_oleh', 'id_pegawai');
    }

    public function scopeAktif($q)
    {
        return $q->whereIn('status', self::STATUS_AKTIF);
    }
}
