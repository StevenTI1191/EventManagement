<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Technical meeting & gladi resik sebagai entri kalender tersendiri.
 *
 * Keduanya menyimpan tanggal sekaligus jam, dan biasanya jatuh sebelum hari
 * acara. Kalau hanya menempel pada kartu event, jadwalnya tidak terlihat pada
 * tanggal yang sebenarnya — padahal justru hari itulah tim harus hadir.
 */
class JadwalPersiapan
{
    private const JENIS = [
        ['technical_meeting', 'Technical Meeting', 'tm'],
        ['gladi_resik',       'Gladi Resik',       'gladi'],
    ];

    public static function dari(Collection $events): Collection
    {
        $entri = collect();

        foreach ($events as $event) {
            foreach (self::JENIS as [$kolom, $label, $kode]) {
                $nilai = $event->{$kolom} ?? null;

                if (blank($nilai)) {
                    continue;
                }

                // Data lama bisa saja berisi teks bebas — dilewati, bukan
                // membuat seluruh kalender gagal dimuat.
                try {
                    $waktu = Carbon::parse($nilai);
                } catch (\Throwable) {
                    continue;
                }

                $entri->push([
                    'id'       => "{$kode}-{$event->id_event}",
                    'type'     => 'persiapan',
                    'title'    => "{$label} — {$event->nama_event}",
                    'start'    => $waktu->toDateString(),
                    'time'     => $waktu->format('H:i'),
                    'status'   => $label,
                    'area'     => $event->area_event,
                    'client'   => $event->client?->nama_client,
                    'pic'      => $event->pic?->nama_pegawai,
                    'id_event' => $event->id_event,
                ]);
            }
        }

        return $entri;
    }
}
