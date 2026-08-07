<?php

namespace App\Support;

/**
 * Satu sumber lambang perusahaan untuk surel dan dokumen PDF.
 *
 * Ketiga saluran punya kendalanya masing-masing, dan itulah sebabnya
 * penyediaannya dipusatkan di sini alih-alih menulis <img> di tiap berkas:
 *
 *  - SUREL. Menautkan berkas lewat URL membuat lambangnya bergantung pada
 *    APP_URL yang benar DAN pada klien surel yang mau mengambil gambar dari
 *    luar. Pada pengiriman dari lingkungan pengembangan, URL-nya menunjuk
 *    host yang tidak dapat dijangkau siapa pun sehingga yang sampai ke klien
 *    hanyalah ikon gambar rusak. Karena itu berkasnya DISISIPKAN ke dalam
 *    surel (cid:) ketika memungkinkan, sehingga tidak ada permintaan keluar
 *    sama sekali.
 *
 *  - PDF. DomPDF tidak mengambil berkas dari jaringan kecuali diizinkan
 *    terang-terangan, jadi URL biasa berakhir sebagai kotak kosong. Data URI
 *    selalu terbaca tanpa bergantung pada jaringan maupun letak berkasnya.
 *
 *  - BERKAS HILANG. Bila lambangnya tidak ada, penyedia ini mengembalikan
 *    null supaya tampilannya jatuh ke nama perusahaan dalam bentuk teks —
 *    bukan ikon gambar rusak.
 *
 * Berkas sumbernya berukuran 4500x4500 piksel, jadi setiap penempatan WAJIB
 * menyertakan lebar & tinggi. Tanpa itu sebagian klien surel merentangkannya
 * selebar layar.
 */
class Logo
{
    /** Sisi tampilan bawaan dalam piksel. Berkas sumbernya bujur sangkar. */
    public const SISI = 56;

    private static ?string $dataUri = null;
    private static bool $dataUriDicoba = false;

    /** Letak berkas relatif terhadap public/, dari config agar bisa diganti. */
    public static function relatif(): string
    {
        return (string) config('perusahaan.logo', 'images/LaksamanaLogo.png');
    }

    /** Letak berkas sesungguhnya di disk, atau null bila tidak ada. */
    public static function berkas(): ?string
    {
        $path = public_path(self::relatif());

        return is_file($path) && is_readable($path) ? $path : null;
    }

    /**
     * Lambang sebagai data URI, dipakai dokumen PDF.
     *
     * Mengembalikan null ketika ekstensi GD tidak terpasang, dan itu DISENGAJA.
     * DomPDF merasterkan setiap gambar lewat GD; tanpa ekstensi itu ia melempar
     * "The PHP GD extension is required" dan seluruh dokumen GAGAL TERBIT —
     * bukan sekadar lambangnya yang hilang. Invoice, kwitansi, dan penawaran
     * adalah dokumen yang dibutuhkan klien, jadi hiasan tidak boleh punya kuasa
     * menggagalkannya. Bila GD tidak ada, dokumennya tetap terbit dengan nama
     * perusahaan dalam bentuk teks seperti sebelumnya.
     *
     * Peladen produksi memasang GD (lihat Dockerfile), jadi di sanalah
     * lambangnya tampil. PHP bawaan Laragon umumnya tidak — karena itu jangan
     * heran bila PDF lokal tampak tanpa lambang.
     *
     * Hasilnya diingat sepanjang permintaan karena satu dokumen bisa
     * memanggilnya lebih dari sekali, sedangkan berkasnya ratusan kilobita.
     */
    public static function dataUri(): ?string
    {
        if (self::$dataUriDicoba) {
            return self::$dataUri;
        }

        self::$dataUriDicoba = true;

        if (! extension_loaded('gd')) {
            return self::$dataUri = null;
        }

        $path = self::berkas();
        if ($path === null) {
            return self::$dataUri = null;
        }

        $isi = @file_get_contents($path);
        if ($isi === false || $isi === '') {
            return self::$dataUri = null;
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'webp'        => 'image/webp',
            'gif'         => 'image/gif',
            default       => 'image/png',
        };

        return self::$dataUri = 'data:' . $mime . ';base64,' . base64_encode($isi);
    }

    /**
     * Sumber gambar untuk surel.
     *
     * @param  mixed $message objek pesan yang tersedia pada view surel saat
     *         benar-benar dikirim. Saat surel hanya dirender (pratinjau atau
     *         pengujian) objek itu tidak ada, dan penyisipan cid: pun tidak
     *         mungkin — pada keadaan itu dipakai URL mutlak sebagai gantinya.
     */
    public static function untukEmail($message = null): ?string
    {
        $path = self::berkas();
        if ($path === null) {
            return null;
        }

        if (is_object($message) && method_exists($message, 'embed')) {
            try {
                return $message->embed($path);
            } catch (\Throwable $e) {
                // Jatuh ke URL di bawah — lambang bukan alasan untuk
                // menggagalkan pengiriman surelnya.
                \Log::warning('Penyisipan lambang ke surel gagal: ' . $e->getMessage());
            }
        }

        return asset(self::relatif());
    }

    /** Nama perusahaan, dipakai sebagai pengganti ketika lambangnya tidak ada. */
    public static function namaPerusahaan(): string
    {
        return (string) config('perusahaan.nama', 'PT Laksamana Muda Bersatu');
    }
}
