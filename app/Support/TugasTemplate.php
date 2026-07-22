<?php

namespace App\Support;

use App\Models\Event;
use App\Models\Pegawai;
use App\Models\Tugas;
use Illuminate\Support\Carbon;

/**
 * Pembuat item to-do dari template per divisi.
 *
 * Dipakai dua jalur:
 *  1. Manual — menu Planning Event (EM/Manajemen memilih kategori).
 *  2. Otomatis — saat event klien (eksternal) masuk Upcoming, papan to-do-nya
 *     langsung terisi supaya divisi tidak mulai dari nol.
 */
class TugasTemplate
{
    /**
     * Buat item to-do untuk sebuah event.
     *
     * @param  array|null  $categories  null = semua kategori
     */
    public static function generate(Event $event, ?array $categories = null): void
    {
        $now  = now();
        $rows = [];
        $pic  = self::picPerKategori();

        foreach (PlanningTemplate::items() as $kategori => $items) {
            if ($categories !== null && ! in_array($kategori, $categories, true)) {
                continue;
            }

            $urutan = 0;
            foreach ($items as [$nama, $timeline]) {
                $rows[] = [
                    'id_event'       => $event->id_event,
                    'nama_tugas'     => $nama,
                    'kategori'       => $kategori,
                    // PIC otomatis sesuai divisi kategorinya (bisa diubah manual).
                    'id_pegawai'     => $pic[$kategori] ?? null,
                    'timeline'       => $timeline,
                    'deadline_tugas' => self::deadlineDariTimeline($event->tgl_mulai_event, $timeline),
                    'status_tugas'   => 'Ongoing',
                    'progress'       => 0,
                    'urutan'         => $urutan++,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ];
            }
        }

        if ($rows) {
            Tugas::insert($rows);
        }
    }

    /**
     * Peta kategori to-do → posisi pegawai yang menanganinya, urut prioritas
     * (kiri = paling spesifik). To-do otomatis ditugaskan ke pegawai pertama
     * yang posisinya cocok, sehingga tiap divisi jatuh ke spesialisnya —
     * mis. tugas Sosial Media ke pegawai Social Media (Christy), Marketing ke
     * Event Marketing (Devani), Legalitas ke pegawai Lapangan (Tegar) —
     * bukan menumpuk semua ke satu orang. Kandidat terakhir berperan sebagai
     * cadangan bila spesialisnya belum ada.
     */
    private const KATEGORI_POSISI = [
        'Talent'                     => ['Talent', 'EventMarketing'],
        'Legalitas'                  => ['Legalitas', 'Lapangan', 'EventMarketing'],
        'Marketing'                  => ['Marketing', 'EventMarketing'],
        'Sosial Media & Designer'    => ['Social Media', 'Sosial Media', 'Media', 'Design', 'EventMarketing'],
        'Strategi Penjualan / Promo' => ['Marketing', 'Promo', 'EventMarketing'],
        'Ticketing & Registration'   => ['Ticketing', 'EventMarketing'],
        'Acara'                      => ['Acara', 'EventMarketing'],
        'Finance'                    => ['Finance'],
        'Operasional - Kasir'        => ['Kasir', 'Finance'],
        'F&B'                        => ['Kitchen', 'F&B', 'Bar'],
        'Operasional - Floor'        => ['Floor', 'Operasional', 'Lapangan'],
        'Operasional - Lainnya'      => ['Operasional', 'Lapangan'],
    ];

    /**
     * Peta kategori → id_pegawai yang otomatis ditugaskan, berdasarkan posisi
     * (lihat KATEGORI_POSISI). Bila tidak ada posisi yang cocok, jatuh ke
     * pegawai eksternal mana pun; bila itu pun tak ada, kategori dibiarkan
     * tanpa PIC agar bisa diisi manual di board.
     */
    private static function picPerKategori(): array
    {
        // Ambil sekali, lalu resolusi di memori (hindari query per kategori).
        $pegawai = Pegawai::get(['id_pegawai', 'posisi_pegawai', 'jenis_pegawai']);

        // id pegawai pertama yang posisinya memuat salah satu kandidat.
        $cari = function (array $kandidat) use ($pegawai) {
            foreach ($kandidat as $pos) {
                $p = $pegawai->first(fn ($x) => str_contains(
                    mb_strtolower((string) $x->posisi_pegawai),
                    mb_strtolower($pos)
                ));
                if ($p) {
                    return $p->id_pegawai;
                }
            }
            return null;
        };

        $eksternal = $pegawai->firstWhere('jenis_pegawai', 'Eksternal')?->id_pegawai;

        $peta = [];
        foreach (self::KATEGORI_POSISI as $kategori => $kandidat) {
            $peta[$kategori] = $cari($kandidat) ?? $eksternal;
        }

        return $peta;
    }

    /** Terjemahkan timeline template ("H-60", "H") jadi tanggal deadline. */
    public static function deadlineDariTimeline($eventStart, ?string $timeline): ?string
    {
        if (! $eventStart || ! $timeline) {
            return null;
        }

        $start = Carbon::parse($eventStart);

        if (preg_match('/H\s*-\s*(\d+)/i', $timeline, $m)) {
            return $start->copy()->subDays((int) $m[1])->toDateString();
        }

        // Timeline "H" atau "H (Hari - H)" tanpa angka dianggap hari-H
        if (preg_match('/\bH\b/i', $timeline) && ! preg_match('/\d/', $timeline)) {
            return $start->toDateString();
        }

        return null;
    }
}
