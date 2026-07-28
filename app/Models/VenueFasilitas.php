<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu fasilitas venue yang ditawarkan ke klien (panggung, videotron, sound
 * system, area indoor, VIP room, dan sejenisnya) beserta fotonya.
 *
 * Ditampilkan pada halaman depan klien agar calon klien tahu apa saja yang
 * sudah tersedia di tempat, sebagaimana tercantum pada surat penawaran.
 */
class VenueFasilitas extends Model
{
    protected $table = 'venue_fasilitas';

    protected $fillable = ['nama', 'spesifikasi', 'keterangan', 'foto', 'urutan', 'aktif'];

    protected $casts = ['aktif' => 'boolean'];

    /** Yang tampil di halaman publik, sesuai urutan yang ditetapkan tim. */
    public function scopeTampil($q)
    {
        return $q->where('aktif', true)->orderBy('urutan')->orderBy('id');
    }

    protected static function booted(): void
    {
        // Foto disimpan di public/venue; barisnya hilang, berkasnya harus ikut.
        static::deleting(function (self $f) {
            $f->hapusFoto();
        });
    }

    /** Hapus berkas foto milik baris ini dari disk. */
    public function hapusFoto(): void
    {
        self::hapusBerkas($this->foto);
    }

    /**
     * Hapus satu berkas foto dari disk, dijaga agar tak keluar dari
     * public/venue. Dibuat statis karena controller juga perlu membuang berkas
     * yang terlanjur tersimpan ketika penulisan barisnya gagal — saat itu belum
     * ada model yang memilikinya.
     */
    public static function hapusBerkas(?string $path): void
    {
        if (blank($path)) {
            return;
        }

        $dir   = realpath(public_path('venue'));
        $penuh = realpath(public_path($path));

        if ($dir && $penuh && str_starts_with($penuh, $dir . DIRECTORY_SEPARATOR)) {
            @unlink($penuh);
        }
    }
}
