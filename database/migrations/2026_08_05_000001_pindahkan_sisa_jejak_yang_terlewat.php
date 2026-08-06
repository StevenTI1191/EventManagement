<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Pindahkan jejak yang LUPUT dari migrasi pemisahan pertama.
 *
 * Migrasi 2026_08_02_000001 hanya memindahkan potongan yang BERAKHIRAN stempel
 * waktu "(28 Jul 2026 23:25)". Kenyataannya sebagian besar jejak menaruh
 * waktunya di tengah kalimat, misalnya:
 *
 *   "Penawaran DITERIMA klien (23 Jul 2026 10:15) — otomatis pindah ke Deal."
 *   "Dibatalkan klien (23 Jul 2026 10:15): alasannya — uang muka hangus."
 *   "Klien meminta ganti tanggal ke 14 September 2026 (…): alasannya"
 *   "Otomatis masuk Penyelesaian (…) — acara sudah lewat tetapi …"
 *
 * Seluruh bentuk itu tidak cocok dengan pola berjangkar akhir, sehingga tetap
 * tinggal di note_event. Padahal note_event tampil pada dashboard klien dan
 * tercetak pada PDF penawaran maupun PDF detail acara, jadi jejak internal
 * seperti alasan penolakan Manajemen masih terbaca klien.
 *
 * Pola di sini mencari stempel waktunya DI MANA PUN dalam potongan, bukan hanya
 * di ujung, dan tetap menyisakan potongan yang benar-benar catatan tim.
 */
return new class extends Migration
{
    /** Stempel waktu jejak, di posisi mana pun: "(28 Jul 2026 23:25)". */
    private const POLA_WAKTU = '/\(\d{1,2} \p{L}{3} \d{4} \d{2}:\d{2}\)/u';

    /** Bentuk lama tanpa jam, khusus "Tidak jadi (28 Jul 2026)". */
    private const POLA_TANGGAL = '/\(\d{1,2} \p{L}{3} \d{4}\)/u';

    /**
     * Awalan jejak yang dikenali walau stempel waktunya sudah hilang, misalnya
     * karena pernah disunting tangan.
     */
    private const AWALAN = [
        'Penawaran DITERIMA klien', 'Penawaran DITOLAK klien',
        'Klien minta penyesuaian penawaran', 'Klien meminta ganti tanggal',
        'Dibatalkan klien', 'Tidak jadi', 'Otomatis ditandai selesai',
        'Otomatis masuk Penyelesaian', 'Jadwal dipindah dari',
        'Permintaan ganti tanggal ditolak Manajemen',
        'Penawaran disetujui Manajemen', 'Penawaran ditolak Manajemen',
    ];

    public function up(): void
    {
        DB::table('events')
            ->whereNotNull('note_event')
            ->orderBy('id_event')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    [$catatan, $jejak] = $this->pilah((string) $row->note_event);

                    if ($jejak === []) {
                        continue;
                    }

                    // Jejak yang sudah ada dipertahankan di atas, temuan baru
                    // ditambahkan sesudahnya. Urutan antar keduanya tidak dapat
                    // dipastikan lagi, tetapi tiap barisnya tetap berstempel
                    // waktu sehingga masih dapat dibaca.
                    $lama = trim((string) ($row->jejak_event ?? ''));
                    $baru = implode("\n", $jejak);

                    DB::table('events')->where('id_event', $row->id_event)->update([
                        'note_event'  => $catatan !== '' ? $catatan : null,
                        'jejak_event' => $lama !== '' ? $lama . "\n" . $baru : $baru,
                    ]);
                }
            }, 'id_event');
    }

    /**
     * Pisahkan potongan yang berupa jejak dari yang berupa catatan asli.
     *
     * @return array{0:string, 1:array<int,string>}
     */
    private function pilah(string $isi): array
    {
        $catatan = [];
        $jejak   = [];

        foreach (explode(' | ', $isi) as $potong) {
            $potong = trim($potong);

            if ($potong === '') {
                continue;
            }

            $this->jejakKah($potong) ? $jejak[] = $this->bakukan($potong) : $catatan[] = $potong;
        }

        return [implode(' | ', $catatan), $jejak];
    }

    private function jejakKah(string $potong): bool
    {
        if (preg_match(self::POLA_WAKTU, $potong) || preg_match(self::POLA_TANGGAL, $potong)) {
            return true;
        }

        // Emoji pembuka dibuang lebih dulu agar pencocokan awalannya tidak
        // meleset hanya karena potongannya diawali "✅" atau "💬".
        $bersih = preg_replace('/^[^\p{L}\p{N}]+/u', '', $potong);

        foreach (self::AWALAN as $awalan) {
            if (str_starts_with($bersih, $awalan)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ubah ke bentuk baku catatJejak(): "[waktu] teks", tanpa emoji.
     *
     * Stempel waktu di tengah kalimat dipindahkan ke depan supaya sejajar
     * dengan jejak yang ditulis sesudah pemisahan berlaku.
     */
    private function bakukan(string $potong): string
    {
        $waktu = '';

        if (preg_match(self::POLA_WAKTU, $potong, $m)) {
            $waktu  = trim($m[0], '()');
            $potong = str_replace($m[0], '', $potong);
        } elseif (preg_match(self::POLA_TANGGAL, $potong, $m)) {
            $waktu  = trim($m[0], '()');
            $potong = str_replace($m[0], '', $potong);
        }

        // Rapikan sisa tanda baca dan spasi ganda bekas potongan stempelnya.
        $potong = preg_replace('/\s{2,}/u', ' ', $potong);
        $potong = preg_replace('/\s+([:.,])/u', '$1', $potong);
        $potong = preg_replace('/^[^\p{L}\p{N}]+/u', '', trim($potong));
        $potong = trim($potong);

        return $waktu !== '' ? "[{$waktu}] {$potong}" : $potong;
    }

    /**
     * Tidak dapat dikembalikan dengan tepat: penggabungan ulang akan menaruh
     * jejak yang memang sudah terpisah sejak semula ke dalam catatan klien.
     * Dibiarkan kosong agar rollback tidak justru menimbulkan kebocoran.
     */
    public function down(): void
    {
    }
};
