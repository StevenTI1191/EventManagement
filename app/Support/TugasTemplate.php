<?php

namespace App\Support;

use App\Models\Event;
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
