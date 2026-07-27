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

    /**
     * Batas akhir pembayaran: seluruh tagihan acara harus lunas paling lambat
     * H-3 sebelum hari pelaksanaan, supaya tim punya jeda memastikan
     * pembayarannya beres sebelum masuk persiapan hari-H.
     */
    public const HARI_BATAS_LUNAS = 3;

    /**
     * Selaraskan jatuh tempo tagihan yang BELUM dibayar dengan tanggal acara.
     *
     * Dipakai ketika jadwal acara berpindah: tanpa ini jatuh temponya tetap
     * mengacu tanggal lama, sehingga acara yang diundur akan ditagih jauh
     * sebelum waktunya dan penjadwal pengingat menganggapnya menunggak.
     *
     * Tagihan yang sudah lunas tidak disentuh — riwayat pembayarannya harus
     * tetap mencerminkan keadaan saat itu.
     */
    public static function selaraskanJatuhTempo(Event $event): int
    {
        if (blank($event->tgl_mulai_event)) {
            return 0;
        }

        $batas = \Illuminate\Support\Carbon::parse($event->tgl_mulai_event)
            ->subDays(self::HARI_BATAS_LUNAS);

        if ($batas->lt(now())) {
            $batas = now();
        }

        return self::where('id_event', $event->id_event)
            ->where('status', self::STATUS_BELUM)
            ->update(['tgl_jatuh_tempo' => $batas->toDateString()]);
    }

    /**
     * Terbitkan satu invoice (DP atau Pelunasan) untuk sebuah event — inti
     * pembuatan yang dipakai bersama jalur manual (Finance) & otomatis. Tanpa
     * validasi kelayakan; pemanggil yang menjaganya. Nominal & jatuh tempo
     * dihitung seragam: DP maks 7 hari sejak terbit, pelunasan langsung di
     * batas akhir; keduanya tak pernah melewati H-3 maupun jatuh di masa lampau.
     */
    public static function buat(Event $event, string $tipe, ?int $idPegawai = null): self
    {
        $total   = (float) ($event->deal_harga_event ?? 0);
        $dp      = self::nominalDp($total);
        $nominal = $tipe === self::TIPE_DP ? $dp : ($total - $dp);

        $mulai      = \Illuminate\Support\Carbon::parse($event->tgl_mulai_event);
        $batasAkhir = $mulai->copy()->subDays(self::HARI_BATAS_LUNAS);

        if ($tipe === self::TIPE_DP) {
            $jatuhTempo = now()->addDays(7);
            if ($jatuhTempo->gt($batasAkhir)) {
                $jatuhTempo = $batasAkhir;
            }
        } else {
            $jatuhTempo = $batasAkhir;
        }
        if ($jatuhTempo->lt(now())) {
            $jatuhTempo = now();
        }

        return self::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => $idPegawai,
            'nomor_invoice'   => self::generateNomor(),
            'tipe'            => $tipe,
            'nominal'         => $nominal,
            'tgl_terbit'      => now()->toDateString(),
            'tgl_jatuh_tempo' => $jatuhTempo->toDateString(),
            'status'          => self::STATUS_BELUM,
        ]);
    }

    /**
     * Auto-terbit invoice DP begitu event mencapai Deal. Idempotent & aman:
     * hanya untuk event eksternal berharga jelas yang belum punya invoice DP.
     */
    public static function terbitkanDpOtomatis(Event $event): ?self
    {
        if ($event->tipe_event !== Event::TIPE_EKSTERNAL) return null;
        if ($event->status_event !== Event::STATUS_DEAL)   return null;
        if (! $event->tgl_mulai_event)                     return null;
        if ((float) ($event->deal_harga_event ?? 0) <= 0)  return null;
        if (self::where('id_event', $event->id_event)->where('tipe', self::TIPE_DP)->exists()) return null;

        return self::buat($event, self::TIPE_DP);
    }

    /**
     * Auto-terbit invoice Pelunasan setelah DP lunas (dipanggil saat event naik
     * ke Upcoming). Idempotent: hanya bila DP sudah Lunas dan pelunasan belum ada.
     */
    public static function terbitkanPelunasanOtomatis(Event $event): ?self
    {
        if ($event->tipe_event !== Event::TIPE_EKSTERNAL) return null;
        if (! $event->tgl_mulai_event)                    return null;
        if ((float) ($event->deal_harga_event ?? 0) <= 0) return null;
        if (self::where('id_event', $event->id_event)->where('tipe', self::TIPE_PELUNASAN)->exists()) return null;

        $dpLunas = self::where('id_event', $event->id_event)
            ->where('tipe', self::TIPE_DP)
            ->where('status', self::STATUS_LUNAS)
            ->exists();
        if (! $dpLunas) return null;

        return self::buat($event, self::TIPE_PELUNASAN);
    }
}
