<?php

namespace App\Support;

/**
 * Ubah bilangan menjadi kata (Bahasa Indonesia) untuk kwitansi.
 * Contoh: 1500000 → "satu juta lima ratus ribu".
 */
class Terbilang
{
    private const ANGKA = [
        '', 'satu', 'dua', 'tiga', 'empat', 'lima',
        'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
    ];

    public static function konversi($nilai): string
    {
        $nilai = (int) round((float) $nilai);
        if ($nilai < 0) {
            return 'minus ' . self::konversi(abs($nilai));
        }

        // Rapikan spasi ganda yang muncul dari komponen bernilai nol.
        $hasil = trim(preg_replace('/\s+/', ' ', self::baca($nilai)));

        return $hasil === '' ? 'nol' : $hasil;
    }

    private static function baca(int $n): string
    {
        if ($n < 12) {
            return self::ANGKA[$n];
        }
        if ($n < 20) {
            return self::baca($n - 10) . ' belas';
        }
        if ($n < 100) {
            return self::baca(intdiv($n, 10)) . ' puluh ' . self::baca($n % 10);
        }
        if ($n < 200) {
            return 'seratus ' . self::baca($n - 100);
        }
        if ($n < 1000) {
            return self::baca(intdiv($n, 100)) . ' ratus ' . self::baca($n % 100);
        }
        if ($n < 2000) {
            return 'seribu ' . self::baca($n - 1000);
        }
        if ($n < 1000000) {
            return self::baca(intdiv($n, 1000)) . ' ribu ' . self::baca($n % 1000);
        }
        if ($n < 1000000000) {
            return self::baca(intdiv($n, 1000000)) . ' juta ' . self::baca($n % 1000000);
        }
        if ($n < 1000000000000) {
            return self::baca(intdiv($n, 1000000000)) . ' miliar ' . self::baca($n % 1000000000);
        }

        return self::baca(intdiv($n, 1000000000000)) . ' triliun ' . self::baca($n % 1000000000000);
    }
}
