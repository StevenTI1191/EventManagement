<?php

namespace App\Support;

/**
 * Satu aturan untuk seluruh unggahan GAMBAR di sistem.
 *
 * Sebelumnya aturannya ditulis ulang di enam tempat dengan isi yang berbeda-
 * beda: fasilitas venue memakai daftar putih `mimes` beserta pesan galat
 * berbahasa Indonesia, sedangkan poster acara, foto dokumentasi, dan bukti
 * transaksi memakai `image` tanpa pesan. Akibatnya penolakan berbunyi lain di
 * tiap halaman, dan daftar format di formulir React pun sempat berselisih
 * dengan yang benar-benar diterima server.
 *
 * CATATAN tentang SVG. Komentar pada aturan venue dahulu menyebut `image`
 * meloloskan SVG. Itu benar untuk Laravel sampai versi 11, tetapi TIDAK lagi
 * pada Laravel 12 yang dipakai proyek ini: validateImage() hanya menerima
 * jpg, jpeg, png, gif, bmp, dan webp, dan SVG harus diminta terang-terangan
 * lewat `image:allow_svg`. Jadi penyatuan ini bukan penambalan lubang, melainkan
 * penyeragaman — daftar putihnya tetap dipertahankan karena menyebut format
 * yang diterima secara terang lebih mudah ditinjau daripada bersandar pada isi
 * aturan bawaan kerangka kerja yang bisa berubah antarversi.
 *
 * `mimes` menebak format dari ISI berkas, bukan dari nama kiriman pengguna,
 * jadi mengganti nama tidak menolongnya lolos. Nama simpannya sendiri selalu
 * datang dari hashName() di sisi pemanggil, supaya ekstensinya pun tidak
 * pernah berasal dari pengguna.
 */
class UnggahGambar
{
    /**
     * Format yang diterima — sengaja daftar putih, bukan daftar hitam.
     *
     * Keempatnya dapat ditampilkan langsung oleh peramban maupun dicetak ke
     * PDF. Daftar ini mengikuti yang sudah dipakai fasilitas venue, sehingga
     * GIF dan BMP kini ikut ditolak pada poster acara, foto dokumentasi, dan
     * bukti transaksi — ketiganya dahulu meloloskannya lewat `image`. Tidak ada
     * berkas tersimpan yang terdampak. Bila GIF memang dibutuhkan, cukup
     * tambahkan di sini dan pada FILE_RULES di formulir React.
     *
     * HEIC dari iPhone sengaja di luar daftar karena tidak terbaca peramban.
     */
    public const FORMAT = ['jpg', 'jpeg', 'png', 'webp'];

    /** Batas bawaan: cukup besar untuk foto ponsel, tidak membebani halaman. */
    public const MAKS_KB = 8192;

    /** Untuk atribut accept pada input berkas, agar pemilihnya ikut menyaring. */
    public const ACCEPT = 'image/jpeg,image/png,image/webp';

    /**
     * Aturan validasi satu berkas gambar.
     *
     * @param bool     $wajib  berkasnya harus ada
     * @param int|null $maksKb batas ukuran; null memakai MAKS_KB
     * @return array<int,string>
     */
    public static function aturan(bool $wajib = false, ?int $maksKb = null): array
    {
        return [
            $wajib ? 'required' : 'nullable',
            'file',
            'mimes:' . implode(',', self::FORMAT),
            'max:' . ($maksKb ?? self::MAKS_KB),
        ];
    }

    /**
     * Pesan galat berbahasa Indonesia untuk satu kolom berkas gambar.
     *
     * @param string   $kolom   nama kolom pada formulir, mis. "poster_event"
     * @param string   $sebutan sebutan berkasnya pada kalimat, mis. "Poster"
     * @param int|null $maksKb  batas yang benar-benar dipakai kolom itu
     * @return array<string,string>
     */
    public static function pesan(string $kolom, string $sebutan = 'Foto', ?int $maksKb = null): array
    {
        $mb = round(($maksKb ?? self::MAKS_KB) / 1024);

        return [
            "{$kolom}.required" => "Unggah {$sebutan} terlebih dahulu.",
            "{$kolom}.mimes"    => "Format {$sebutan} harus JPG, PNG, atau WEBP. "
                . 'Foto dari iPhone berformat HEIC perlu diubah dulu ke JPG.',
            "{$kolom}.max"      => "Ukuran {$sebutan} maksimal {$mb} MB.",
            // Muncul ketika PHP sendiri menolak unggahannya, biasanya karena
            // upload_max_filesize di server lebih kecil daripada batas di atas.
            "{$kolom}.uploaded" => "{$sebutan} gagal diunggah. Ukurannya kemungkinan "
                . 'melebihi batas yang diizinkan server.',
        ];
    }
}
