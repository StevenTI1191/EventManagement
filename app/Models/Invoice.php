<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Invoice untuk event eksternal (dari klien).
 *  - DP        : tagihan uang muka 50% setelah event mencapai tahap Deal.
 *  - Pelunasan : tagihan sisa 50% setelah DP dibayar (event sudah Upcoming).
 */
class Invoice extends Model
{
    protected $table = 'invoices';
    protected $primaryKey = 'id_invoice';

    protected $fillable = [
        'id_event',
        'id_pegawai',
        'nomor_invoice',
        'tipe',
        'nominal',
        'tgl_terbit',
        'tgl_jatuh_tempo',
        'status',
        'keterangan',
    ];

    protected $casts = [
        'tgl_terbit'      => 'date',
        'tgl_jatuh_tempo' => 'date',
        'nominal'         => 'decimal:2',
    ];

    public const TIPE_DP         = 'DP';
    public const TIPE_PELUNASAN  = 'Pelunasan';
    public const STATUS_BELUM    = 'Belum Dibayar';
    public const STATUS_LUNAS    = 'Lunas';

    /** Persentase uang muka (DP) dari total deal. Dipakai lintas controller. */
    public const PERSEN_DP = 0.5;

    /** Nominal DP untuk sebuah total deal. */
    public static function nominalDp(float $totalDeal): float
    {
        return round($totalDeal * self::PERSEN_DP);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    /** Pegawai Finance yang menerbitkan invoice. */
    public function penerbit(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai', 'id_pegawai');
    }

    /**
     * Nomor invoice berurutan per bulan, mis. INV/2026/07/0001.
     */
    public static function generateNomor(): string
    {
        $prefix = 'INV/' . now()->format('Y/m') . '/';

        $terakhir = static::where('nomor_invoice', 'like', $prefix . '%')
            ->orderByDesc('id_invoice')
            ->value('nomor_invoice');

        $urut = $terakhir ? ((int) substr($terakhir, strrpos($terakhir, '/') + 1)) + 1 : 1;

        return $prefix . str_pad((string) $urut, 4, '0', STR_PAD_LEFT);
    }
}
