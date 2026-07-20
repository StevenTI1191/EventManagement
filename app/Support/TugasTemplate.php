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
     * Divisi mana yang bertanggung jawab atas tiap kategori to-do. Kategori
     * yang tidak terdaftar di sini ditangani pegawai lapangan/eksternal.
     */
    private const DIVISI_KATEGORI = [
        'em' => [
            'Talent', 'Legalitas', 'Marketing', 'Sosial Media & Designer',
            'Strategi Penjualan / Promo', 'Ticketing & Registration', 'Acara',
        ],
        'finance' => [
            'Finance', 'Operasional - Kasir',
        ],
        // F&B, Operasional - Floor, Operasional - Lainnya → pegawai eksternal.
    ];

    /**
     * Peta kategori → id_pegawai yang otomatis ditugaskan.
     *
     * PIC dipilih sekali per divisi lalu dipakai ulang, supaya to-do dari satu
     * event konsisten: kategori pemasaran ke tim Event Marketing, kategori
     * keuangan/kasir ke tim Finance, dan operasional lapangan ke pegawai
     * eksternal. Bila divisinya belum punya pegawai, kategorinya dibiarkan
     * tanpa PIC agar bisa diisi manual di board.
     */
    private static function picPerKategori(): array
    {
        $em       = Pegawai::whereIn('posisi_pegawai', ['EventMarketing', 'Event Marketing'])->value('id_pegawai');
        $finance  = Pegawai::where('posisi_pegawai', 'Finance')->value('id_pegawai');
        $eksternal = Pegawai::where('jenis_pegawai', 'Eksternal')->value('id_pegawai');

        $peta = [];
        foreach (self::DIVISI_KATEGORI['em'] as $k)      { $peta[$k] = $em; }
        foreach (self::DIVISI_KATEGORI['finance'] as $k) { $peta[$k] = $finance; }
        // Kategori operasional lapangan yang tersisa → eksternal.
        foreach (['F&B', 'Operasional - Floor', 'Operasional - Lainnya'] as $k) {
            $peta[$k] = $eksternal;
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
