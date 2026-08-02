<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak sistem dipindahkan keluar dari note_event.
 *
 * Selama ini setiap peristiwa penawaran, pembatalan, dan penggantian tanggal
 * ditempelkan ke note_event dengan pemisah " | ". Kolom itu adalah catatan
 * acara yang IKUT TERCETAK pada PDF penawaran dan PDF detail acara — keduanya
 * diunduh klien. Akibatnya keterangan internal seperti alasan penolakan
 * Manajemen terbaca klien, dan catatan aslinya tenggelam di antara jejak.
 *
 * Jejak kini punya kolomnya sendiri dan tidak pernah masuk dokumen klien.
 */
return new class extends Migration
{
    /** Jejak selalu berakhiran "(28 Jul 2026 23:25)" — itu penandanya. */
    private const POLA = '/\(\d{1,2} \p{L}{3} \d{4} \d{2}:\d{2}\)$/u';

    public function up(): void
    {
        if (! Schema::hasColumn('events', 'jejak_event')) {
            Schema::table('events', function (Blueprint $t) {
                $t->text('jejak_event')->nullable()->after('note_event');
            });
        }

        DB::table('events')
            ->whereNotNull('note_event')
            ->where('note_event', 'like', '%(%')
            ->orderBy('id_event')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    [$catatan, $jejak] = $this->pilah((string) $row->note_event);

                    // Tidak ada satu pun jejak di dalamnya — biarkan apa adanya.
                    if ($jejak === []) {
                        continue;
                    }

                    DB::table('events')->where('id_event', $row->id_event)->update([
                        'note_event'  => $catatan !== '' ? $catatan : null,
                        'jejak_event' => implode("\n", $jejak),
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

            if (preg_match(self::POLA, $potong)) {
                $jejak[] = $this->bakukan($potong);
            } else {
                $catatan[] = $potong;
            }
        }

        return [implode(' | ', $catatan), $jejak];
    }

    /** "✅ Teks (28 Jul 2026 23:25)" menjadi "[28 Jul 2026 23:25] Teks". */
    private function bakukan(string $potong): string
    {
        if (! preg_match('/^(.*?)\s*\((\d{1,2} \p{L}{3} \d{4} \d{2}:\d{2})\)$/u', $potong, $c)) {
            return $potong;
        }

        // Emoji di awal dibuang: font PDF tidak memilikinya, sehingga tercetak
        // sebagai kotak kosong.
        $teks = preg_replace('/^[^\p{L}\p{N}]+/u', '', trim($c[1]));

        return '[' . $c[2] . '] ' . $teks;
    }

    public function down(): void
    {
        if (Schema::hasColumn('events', 'jejak_event')) {
            Schema::table('events', function (Blueprint $t) {
                $t->dropColumn('jejak_event');
            });
        }
    }
};
