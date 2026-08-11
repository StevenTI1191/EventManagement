<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tugas extends Model
{
    protected $table = 'tugas';
    protected $primaryKey = 'id_tugas';

    protected $fillable = [
        'id_event',
        'nama_tugas',
        'kategori',
        'timeline',
        'id_pegawai',
        'deskripsi_tugas',
        'catatan_tugas',
        'deadline_tugas',
        'status_tugas',
        'progress',
        'urutan',
    ];

    protected $casts = [
        'progress' => 'integer',
        'urutan'   => 'integer',
    ];

    /**
     * Persentase kesiapan persiapan sebuah acara — SATU rumus untuk semua layar.
     *
     * Sebelumnya angka ini dihitung dengan dua cara berbeda. Papan Planning dan
     * papan Task Divisi memakai rata-rata progress, sedangkan halaman detail
     * acara dan portal klien menghitung tugas berstatus Done dibagi seluruh
     * tugas. Empat tugas yang semuanya berjalan di 50% karena itu terbaca 50%
     * pada satu layar dan 0% pada layar lainnya — untuk acara yang sama, pada
     * hari yang sama.
     *
     * Yang dipakai adalah rata-rata progress, sebab itulah yang benar-benar
     * dicatat tim dan tidak membuang keterangan: tugas yang sudah 90% bukan nol.
     * Keduanya pun tidak pernah bertentangan, karena progress dan status_tugas
     * memang saling menyesuaikan — Done selalu berarti 100 (lihat
     * ManagesTugas::updateTugas).
     *
     * @param iterable|null $tugas kumpulan tugas satu acara
     */
    public static function persenSiap($tugas): int
    {
        $tugas = collect($tugas ?? []);

        if ($tugas->isEmpty()) {
            return 0;
        }

        return (int) round($tugas->avg(fn ($t) => (int) ($t->progress ?? 0)));
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function pegawai()
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai', 'id_pegawai');
    }
}
