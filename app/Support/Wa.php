<?php

namespace App\Support;

/**
 * Helper WhatsApp: membangun link wa.me (WhatsApp Web/app) dengan pesan siap kirim.
 * Tidak memakai API resmi — tombol hanya membuka WhatsApp dengan nomor & teks terisi,
 * lampiran PDF diunduh lalu dilampirkan manual oleh pengguna.
 */
class Wa
{
    /**
     * Ubah nomor lokal menjadi format internasional untuk wa.me.
     *  08123456789  -> 628123456789
     *  8123456789   -> 628123456789
     *  +62 812-3456 -> 628123456
     */
    public static function normalisasi(?string $nomor): ?string
    {
        if (blank($nomor)) {
            return null;
        }

        $n = preg_replace('/\D/', '', $nomor); // buang semua selain digit

        if ($n === '') {
            return null;
        }

        if (str_starts_with($n, '0')) {
            $n = '62' . substr($n, 1);
        } elseif (str_starts_with($n, '8')) {
            $n = '62' . $n;
        }

        return $n;
    }

    /** Link WhatsApp dengan pesan siap kirim. Null bila nomor tidak valid. */
    public static function link(?string $nomor, string $pesan = ''): ?string
    {
        $n = static::normalisasi($nomor);

        if (!$n) {
            return null;
        }

        return 'https://wa.me/' . $n . ($pesan !== '' ? '?text=' . rawurlencode($pesan) : '');
    }
}
