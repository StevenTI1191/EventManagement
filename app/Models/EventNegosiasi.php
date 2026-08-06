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

    public const DIAJUKAN     = 'Diajukan';
    public const DIJAWAB      = 'Dijawab';
    public const DIJADWALKAN  = 'Dijadwalkan';
    /** Klien menawar jadwal lain, giliran tim memutuskan. */
    public const USULAN_KLIEN = 'UsulanKlien';
    /**
     * Jadwal sudah disepakati kedua pihak, pertemuannya belum berlangsung.
     *
     * Dulu kesepakatan jadwal langsung menutup negosiasi sebagai Selesai,
     * padahal yang disepakati baru waktunya. Pembahasan yang sesungguhnya
     * belum terjadi, sehingga penawaran revisi pun belum layak diajukan.
     */
    public const MENUNGGU_MEETING = 'MenungguMeeting';
    public const SELESAI      = 'Selesai';
    public const DITUTUP      = 'Ditutup';

    /** Yang masih menunggu tindakan tim. */
    public const PERLU_TIM = [self::DIAJUKAN, self::USULAN_KLIEN];

    /** Yang masih menunggu tindakan klien. */
    public const PERLU_KLIEN = [self::DIJADWALKAN];

    /** Belum tuntas — dipakai untuk lencana maupun penjagaan pengajuan ganda. */
    public const BERJALAN = [
        self::DIAJUKAN, self::DIJAWAB, self::DIJADWALKAN, self::USULAN_KLIEN,
        self::MENUNGGU_MEETING,
    ];

    /**
     * Pertemuannya sudah lewat sehingga hasilnya tinggal dicatat.
     *
     * Jadwal yang dipakai adalah jadwal appointment yang BERLAKU, bukan tanggal
     * usulan pertama, sebab pertemuannya bisa saja sudah dipindahkan.
     */
    public function meetingSudahLewat(): bool
    {
        if ($this->status !== self::MENUNGGU_MEETING) {
            return false;
        }

        $jadwal = $this->appointment?->jadwalBerlaku();

        return $jadwal
            && \Illuminate\Support\Carbon::parse($jadwal['tgl'] . ' ' . $jadwal['jam'])
                ->lessThanOrEqualTo(now());
    }

    /**
     * Antrean kerja tim: permintaan baru yang belum ditanggapi DAN jadwal yang
     * ditawar balik klien. Keduanya sama-sama menggantung sampai tim bertindak.
     */
    public function scopeMenungguTim($q)
    {
        return $q->whereIn('status', self::PERLU_TIM)->acaraMasihAda();
    }

    /**
     * Sisihkan pembahasan milik acara yang sudah batal.
     *
     * Penutupannya kini dikerjakan saat acaranya dibatalkan
     * (tutupUntukEvent()), tetapi baris yang terlanjur menggantung sebelum
     * aturan itu berlaku tidak boleh terus terhitung pada lencana maupun
     * antrean — tidak ada lagi yang bisa ditindaklanjuti darinya.
     */
    public function scopeAcaraMasihAda($q)
    {
        return $q->whereHas('event', fn ($e) => $e->where('status_event', '!=', Event::STATUS_BATAL));
    }

    public function scopeBerjalan($q)
    {
        return $q->whereIn('status', self::BERJALAN);
    }

    /**
     * Tutup semua negosiasi yang masih berjalan pada satu acara, sekaligus
     * melepas slot pertemuan yang sudah terpesan untuknya.
     *
     * Dipanggil setiap kali acaranya berpindah ke keadaan yang membuat
     * pembahasan itu tidak berlaku lagi — dibatalkan, ditandai tidak jadi, atau
     * penawarannya justru diterima klien. Tanpa ini barisnya mengendap selamanya
     * di antrean Event Marketing beserta lencananya, dan yang lebih merugikan:
     * appointment pembahasannya tetap memegang slot_key sehingga jam itu tidak
     * bisa dipakai pertemuan lain padahal tidak akan pernah terjadi.
     *
     * @return int banyaknya negosiasi yang ditutup
     */
    public static function tutupUntukEvent($idEvent, string $alasan): int
    {
        $berjalan = static::with('appointment')
            ->where('id_event', $idEvent)
            ->berjalan()
            ->get();

        foreach ($berjalan as $negosiasi) {
            // Pertemuan yang belum terjadi dilepas. Yang sudah Selesai atau
            // Dibatalkan dibiarkan apa adanya — riwayatnya tetap terbaca.
            if ($negosiasi->appointment
                && in_array($negosiasi->appointment->status, Appointment::STATUS_AKTIF, true)) {
                $negosiasi->appointment->update([
                    'status'         => 'Dibatalkan',
                    'usulan_tgl'     => null,
                    'usulan_jam'     => null,
                    'usulan_catatan' => null,
                ]);
            }

            $negosiasi->update([
                'status'  => self::DITUTUP,
                'balasan' => $alasan,
            ]);
        }

        return $berjalan->count();
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
