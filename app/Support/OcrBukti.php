<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;

/**
 * Pembacaan bukti transfer dengan Tesseract OCR (berjalan lokal di server —
 * gambar bukti pembayaran TIDAK dikirim ke layanan pihak ketiga).
 *
 * Perannya hanya membantu, BUKAN memutuskan:
 *  - Menyaring gambar yang jelas bukan bukti transfer (mis. foto rumah).
 *  - Membaca nominal untuk dicocokkan dengan yang diisi klien.
 * Verifikasi akhir tetap di tangan Finance. OCR tidak pernah meloloskan
 * pembayaran secara otomatis.
 */
class OcrBukti
{
    /** Kata kunci khas bukti transfer / m-banking / e-wallet Indonesia. */
    private const KATA_KUNCI = [
        'transfer', 'transaksi', 'berhasil', 'sukses', 'success', 'nominal',
        'jumlah', 'total', 'rekening', 'saldo', 'ref', 'referensi', 'admin',
        'tujuan', 'penerima', 'pengirim', 'sumber dana', 'nomor kartu',
        'rp', 'idr', 'struk', 'bukti', 'pembayaran', 'payment',
        // Bank & dompet digital
        'bca', 'bni', 'bri', 'mandiri', 'cimb', 'permata', 'danamon', 'btn',
        'bsi', 'mega', 'ocbc', 'panin', 'maybank', 'jago', 'seabank',
        'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'qris', 'flip',
    ];

    /**
     * Baca sebuah berkas bukti.
     *
     * @return array{didukung:bool, teks:string, kata_kunci:int, nominal:array<float>, pesan_gagal:?string}
     */
    public static function baca(string $absolutePath): array
    {
        $kosong = [
            'didukung'    => false,
            'teks'        => '',
            'kata_kunci'  => 0,
            'nominal'     => [],
            'pesan_gagal' => null,
        ];

        // Dimatikan lewat config (mis. di server kecil agar unggahan tak molor).
        if (! config('ocr.enabled', true)) {
            return array_merge($kosong, ['pesan_gagal' => 'OCR dinonaktifkan']);
        }

        // PDF tidak dibaca OCR — langsung diteruskan ke verifikasi manual.
        if (strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION)) === 'pdf') {
            return array_merge($kosong, ['pesan_gagal' => 'PDF tidak dibaca otomatis']);
        }

        if (! is_readable($absolutePath)) {
            return array_merge($kosong, ['pesan_gagal' => 'Berkas tidak terbaca']);
        }

        // Lewati gambar sangat besar — paling lama diproses & paling sering
        // membuat request menggantung.
        $maxBytes = (int) config('ocr.max_bytes', 4 * 1024 * 1024);
        if ($maxBytes > 0 && (int) @filesize($absolutePath) > $maxBytes) {
            return array_merge($kosong, ['pesan_gagal' => 'Berkas terlalu besar untuk OCR']);
        }

        // Seluruh pemanggilan proses eksternal dibungkus try/catch: apa pun yang
        // terjadi (shell_exec dinonaktifkan host, Tesseract error, dsb.) TIDAK
        // boleh menggagalkan unggahan bukti — cukup lewati pembacaan otomatis.
        try {
            $biner = self::cariTesseract();
            if (! $biner) {
                // Lingkungan tanpa Tesseract (mis. dev lokal) — jangan menghalangi upload.
                return array_merge($kosong, ['pesan_gagal' => 'Tesseract tidak tersedia']);
            }

            // Batasi durasi dengan `timeout` bila tersedia, agar proses yang
            // menggantung tidak menahan worker PHP.
            $detik   = max(1, (int) config('ocr.timeout', 20));
            $prefix  = self::cariTimeout() ? (self::cariTimeout() . ' ' . $detik . ' ') : '';
            $perintah = $prefix . escapeshellcmd($biner) . ' ' . escapeshellarg($absolutePath)
                . ' stdout -l ind+eng --psm 6 2>/dev/null';

            $teks = @shell_exec($perintah);
        } catch (\Throwable $e) {
            Log::warning('OCR bukti error: ' . $e->getMessage());
            return array_merge($kosong, ['pesan_gagal' => 'OCR gagal dijalankan']);
        }

        if (! is_string($teks)) {
            Log::warning('OCR bukti gagal dijalankan: ' . $absolutePath);
            return array_merge($kosong, ['pesan_gagal' => 'OCR gagal dijalankan']);
        }

        $teks = trim($teks);

        return [
            'didukung'    => true,
            'teks'        => mb_substr($teks, 0, 4000),
            'kata_kunci'  => self::hitungKataKunci($teks),
            'nominal'     => self::cariNominal($teks),
            'pesan_gagal' => null,
        ];
    }

    /**
     * Kesimpulan konservatif: gambar dianggap BUKAN bukti transfer hanya bila
     * tidak ada satu pun kata kunci finansial DAN tidak ada nominal terbaca.
     * Bila OCR tidak tersedia/gagal, selalu dianggap belum bisa dinilai.
     */
    public static function bukanBuktiTransfer(array $hasil): bool
    {
        if (! $hasil['didukung']) {
            return false;
        }

        return $hasil['kata_kunci'] === 0 && empty($hasil['nominal']);
    }

    /**
     * Cocokkan nominal yang diisi klien dengan angka-angka yang terbaca.
     * Struk memuat banyak angka (biaya admin, saldo), jadi dianggap cocok bila
     * SALAH SATU angka sama persis.
     */
    public static function cocokkanNominal(array $hasil, ?float $nominalDiisi): ?bool
    {
        if (! $hasil['didukung'] || empty($hasil['nominal']) || ! $nominalDiisi) {
            return null; // belum bisa disimpulkan
        }

        foreach ($hasil['nominal'] as $angka) {
            if (abs($angka - $nominalDiisi) < 1) {
                return true;
            }
        }

        return false;
    }

    /** Nominal paling besar yang terbaca — biasanya jumlah transfer. */
    public static function nominalUtama(array $hasil): ?float
    {
        return empty($hasil['nominal']) ? null : max($hasil['nominal']);
    }

    private static function hitungKataKunci(string $teks): int
    {
        $lower  = mb_strtolower($teks);
        $jumlah = 0;

        foreach (self::KATA_KUNCI as $kunci) {
            if (str_contains($lower, $kunci)) {
                $jumlah++;
            }
        }

        return $jumlah;
    }

    /**
     * Ambil angka-angka bernuansa rupiah dari teks.
     * Menangkap "Rp 25.000.000", "25,000,000.00", "IDR 1.500.000", dst.
     * Angka di bawah 1.000 diabaikan supaya nomor referensi/tanggal tidak ikut.
     */
    private static function cariNominal(string $teks): array
    {
        $hasil = [];

        // Angka dengan pemisah ribuan (titik atau koma), opsional 2 desimal.
        preg_match_all('/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?/', $teks, $cocok);

        foreach ($cocok[0] as $mentah) {
            $angka = self::normalisasiAngka($mentah);
            if ($angka !== null && $angka >= 1000) {
                $hasil[] = $angka;
            }
        }

        return array_values(array_unique($hasil));
    }

    /** "25.000.000,00" / "25,000,000.00" → 25000000.0 */
    private static function normalisasiAngka(string $mentah): ?float
    {
        $bersih = preg_replace('/[^\d.,]/', '', $mentah);
        if ($bersih === '') {
            return null;
        }

        $posTitik = strrpos($bersih, '.');
        $posKoma  = strrpos($bersih, ',');
        $pemisahDesimal = null;

        // Pemisah desimal = tanda terakhir yang diikuti tepat 2 digit.
        foreach ([[',', $posKoma], ['.', $posTitik]] as [$tanda, $pos]) {
            if ($pos !== false && strlen($bersih) - $pos - 1 === 2) {
                $pemisahDesimal = $tanda;
            }
        }

        if ($pemisahDesimal !== null) {
            $utuh = substr($bersih, 0, strrpos($bersih, $pemisahDesimal));
            $utuh = preg_replace('/[.,]/', '', $utuh);
        } else {
            $utuh = preg_replace('/[.,]/', '', $bersih);
        }

        return $utuh === '' ? null : (float) $utuh;
    }

    /** Cari biner tesseract; null bila tidak terpasang. */
    private static function cariTesseract(): ?string
    {
        foreach (['/usr/bin/tesseract', '/usr/local/bin/tesseract'] as $kandidat) {
            if (is_executable($kandidat)) {
                return $kandidat;
            }
        }

        try {
            $which = @shell_exec('command -v tesseract 2>/dev/null');
        } catch (\Throwable $e) {
            return null;
        }

        return is_string($which) && trim($which) !== '' ? trim($which) : null;
    }

    /** Cari utilitas `timeout` (coreutils) untuk membatasi durasi OCR; null bila tak ada. */
    private static function cariTimeout(): ?string
    {
        foreach (['/usr/bin/timeout', '/bin/timeout'] as $kandidat) {
            if (is_executable($kandidat)) {
                return $kandidat;
            }
        }

        return null;
    }
}
