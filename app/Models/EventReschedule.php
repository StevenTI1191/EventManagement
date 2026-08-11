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
    /**
     * Status acara yang jadwalnya masih mungkin dipindahkan.
     *
     * Disamakan persis dengan yang diterima RescheduleController::setujui().
     */
    public const ACARA_DAPAT_DIPINDAH = [Event::STATUS_DEAL, Event::STATUS_UPCOMING];

    /**
     * Pengajuan yang benar-benar menunggu keputusan Manajemen.
     *
     * Acara yang jadwalnya sudah tidak mungkin dipindahkan dikecualikan DI SINI,
     * bukan hanya di halaman antreannya — lencana pada menu memakai scope ini
     * juga, dan ketika keduanya berbeda aturan, lencananya menunjukkan angka
     * untuk pekerjaan yang tidak dapat diselesaikan. Menyetujuinya hanya akan
     * ditolak dengan keterangan bahwa acaranya sudah batal atau sudah lewat,
     * sehingga Manajemen terpaksa menolak satu per satu hanya untuk
     * mengosongkan lencananya.
     *
     * Aturan yang sama sudah lebih dulu dipakai Event::scopePenawaranMenunggu();
     * antrean ini yang terlewat.
     */
    public function scopeMenunggu($q)
    {
        return $q->where('status', self::STATUS_DIAJUKAN)
            ->whereHas('event', fn ($e) => $e->whereIn('status_event', self::ACARA_DAPAT_DIPINDAH));
    }
}
