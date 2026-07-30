<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\Event;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Satu sumber aturan slot meeting, dipakai sisi klien (memesan & mengusulkan)
 * maupun sisi tim (mengonfirmasi & menjadwal ulang).
 *
 * Sebelumnya aturannya hanya ada di Client\AppointmentController, sehingga
 * pemesanan klien dijaga ketat sementara konfirmasi tim tidak diperiksa sama
 * sekali: tim bisa mengonfirmasi meeting ke hari Minggu, ke luar jam kerja, atau
 * ke slot yang sudah dipakai appointment lain. Karena usulan jadwal klien
 * disetujui LEWAT konfirmasi, pemeriksaan di sini sekaligus menutup celah
 * "dua klien mengusulkan slot yang sama, keduanya dikonfirmasi".
 */
class SlotMeeting
{
    /** Durasi satu meeting (menit) — dipakai untuk cek bentrok dengan jadwal acara. */
    public const MENIT = 30;

    /** Status appointment yang dianggap "menempati" slot. */
    public const STATUS_MENEMPATI = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    /**
     * Slot meeting harian: 09:00–16:30, selang 1,5 jam (durasi meeting + jeda
     * setengah jam), sehingga jadwalnya 09:00, 10:30, 12:00, 13:30, 15:00, 16:30.
     * Dipakai backend (validasi) & frontend (pemilih jam) agar konsisten.
     */
    public static function kerja(): array
    {
        $slots = [];
        for ($m = 9 * 60; $m <= 16 * 60 + 30; $m += 90) {
            $slots[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        }

        return $slots;
    }

    /** Ubah "HH:MM" jadi menit sejak tengah malam; null → nilai default. */
    public static function keMenit(?string $jam, int $default): int
    {
        if (! $jam) {
            return $default;
        }

        [$h, $m] = array_pad(explode(':', substr($jam, 0, 5)), 2, 0);

        return (int) $h * 60 + (int) $m;
    }

    /**
     * Slot meeting yang terhalang jadwal acara pada satu tanggal. Bila ada acara
     * (Deal ke atas) yang berlangsung pada tanggal & jam itu, tim sedang bertugas
     * sehingga slotnya tidak bisa dipakai meeting.
     *
     * Jendela sibuknya memakai loading in/out — bukan sekadar jam acara — sebab
     * tim sudah di lokasi sejak bongkar-pasang. Tanpa itu, acara 18:00–23:00
     * dengan loading in 14:00 masih menawarkan slot meeting jam 15:00.
     *
     * @return array<string> daftar jam "HH:MM" yang terblokir
     */
    public static function terhalangEvent(string $tgl): array
    {
        $tanggal = Carbon::parse($tgl)->toDateString();

        $events = Event::untukFinance()
            ->whereDate('tgl_mulai_event', '<=', $tanggal)
            ->whereRaw('COALESCE(tgl_selesai_event, tgl_mulai_event) >= ?', [$tanggal])
            ->get(['tgl_mulai_event', 'tgl_selesai_event', 'jam_mulai', 'jam_selesai', 'loading_in', 'loading_out']);

        // Susun jendela "sibuk" (menit) untuk tanggal ini dari tiap acara.
        $jendela = [];
        foreach ($events as $e) {
            $mulaiTgl   = Carbon::parse($e->tgl_mulai_event)->toDateString();
            $selesaiTgl = $e->tgl_selesai_event
                ? Carbon::parse($e->tgl_selesai_event)->toDateString()
                : $mulaiTgl;

            $awalJam  = $e->loading_in  ?: $e->jam_mulai;
            $akhirJam = $e->loading_out ?: $e->jam_selesai;

            $bStart = ($tanggal === $mulaiTgl)   ? self::keMenit($awalJam, 9 * 60)   : 0;
            $bEnd   = ($tanggal === $selesaiTgl) ? self::keMenit($akhirJam, 17 * 60) : 24 * 60;

            // Acara lintas tengah malam (mis. berakhir 02:00 tanpa tanggal
            // selesai): pada tanggal ini ia sibuk sampai habis hari, bukan
            // sampai jam yang lebih kecil dari jam mulainya — jendela terbalik
            // membuat acaranya tidak memblokir apa pun.
            if ($bEnd <= $bStart) {
                $bEnd = 24 * 60;
            }

            $jendela[] = [$bStart, $bEnd];
        }

        $blok = [];
        foreach (self::kerja() as $slot) {
            $t = self::keMenit($slot, 0);
            foreach ($jendela as [$bs, $be]) {
                if ($t < $be && ($t + self::MENIT) > $bs) {
                    $blok[] = $slot;
                    break;
                }
            }
        }

        return $blok;
    }

    /**
     * Apakah slot ini sudah ditempati appointment lain? Dibandingkan terhadap
     * JADWAL BERLAKU (hasil konfirmasi bila sudah ada) — lihat
     * Appointment::SQL_TGL_BERLAKU.
     */
    public static function ditempatiAppointment(string $tgl, string $jam, ?int $kecualiId = null): bool
    {
        return Appointment::query()
            ->whereIn('status', self::STATUS_MENEMPATI)
            ->whereRaw(Appointment::SQL_TGL_BERLAKU . ' = ?', [$tgl])
            ->whereRaw('SUBSTRING(' . Appointment::SQL_JAM_BERLAKU . ', 1, 5) = ?', [substr($jam, 0, 5)])
            ->when($kecualiId, fn ($q) => $q->where('id', '!=', $kecualiId))
            ->exists();
    }

    /** Jam kerja kantor sebagai menit sejak tengah malam. */
    public const KERJA_MULAI   = 9 * 60;        // 09:00
    public const KERJA_SELESAI = 17 * 60;       // 17:00

    /**
     * Rentang jam yang masih kosong pada satu tanggal, dalam bentuk pasangan
     * "HH:MM"–"HH:MM".
     *
     * Dipakai tim saat menawarkan jadwal pembahasan. Berbeda dengan klien yang
     * memilih dari slot tetap, tim boleh menentukan jam bebas — jadi yang
     * dibutuhkan bukan daftar slot melainkan gambaran kapan saja masih lowong.
     *
     * @return array<array{mulai:string,selesai:string}>
     */
    public static function rentangKosong(string $tgl): array
    {
        $tanggal = Carbon::parse($tgl);

        if ($tanggal->isSunday()) {
            return [];
        }

        $sibuk = [];

        // Appointment lain yang masih menempati jadwal pada tanggal ini.
        foreach (Appointment::whereIn('status', self::STATUS_MENEMPATI)
                    ->whereRaw(Appointment::SQL_TGL_BERLAKU . ' = ?', [$tanggal->toDateString()])
                    ->get() as $a) {
            if ($berlaku = $a->jadwalBerlaku()) {
                $m = self::keMenit($berlaku['jam'], 0);
                $sibuk[] = [$m, $m + self::MENIT];
            }
        }

        // Jendela sibuk acara memakai loading in/out, sama seperti terhalangEvent().
        foreach (self::terhalangEvent($tanggal->toDateString()) as $slot) {
            $m = self::keMenit($slot, 0);
            $sibuk[] = [$m, $m + self::MENIT];
        }

        usort($sibuk, fn ($a, $b) => $a[0] <=> $b[0]);

        $hasil = [];
        $kursor = self::KERJA_MULAI;

        foreach ($sibuk as [$mulai, $akhir]) {
            if ($mulai > $kursor) {
                $hasil[] = [$kursor, min($mulai, self::KERJA_SELESAI)];
            }
            $kursor = max($kursor, $akhir);
        }

        if ($kursor < self::KERJA_SELESAI) {
            $hasil[] = [$kursor, self::KERJA_SELESAI];
        }

        $jam = fn (int $m) => sprintf('%02d:%02d', intdiv($m, 60), $m % 60);

        return array_values(array_map(
            fn ($r) => ['mulai' => $jam($r[0]), 'selesai' => $jam($r[1])],
            // Rentang yang lebih pendek daripada satu pertemuan tidak berguna.
            array_filter($hasil, fn ($r) => $r[1] - $r[0] >= self::MENIT)
        ));
    }

    /**
     * Periksa jadwal yang ditentukan tim secara BEBAS — tidak harus jatuh pada
     * slot tetap milik klien, tetapi tetap tidak boleh bertabrakan.
     *
     * Dipakai untuk pembahasan negosiasi: tim menyesuaikan jam dengan klien,
     * sehingga memaksanya ke enam slot baku justru menghalangi kesepakatan.
     */
    public static function periksaBebas(
        string $tgl,
        string $jam,
        ?int $kecualiId = null,
        string $fieldTgl = 'tgl_meeting',
        string $fieldJam = 'jam_meeting',
    ): void {
        $tanggal = Carbon::parse($tgl);

        if ($tanggal->isSunday()) {
            throw ValidationException::withMessages([
                $fieldTgl => 'Hari Minggu libur. Pilih hari Senin–Sabtu.',
            ]);
        }

        $menit = self::keMenit($jam, -1);

        if ($menit < self::KERJA_MULAI || $menit + self::MENIT > self::KERJA_SELESAI) {
            throw ValidationException::withMessages([
                $fieldJam => 'Pertemuan hanya dapat dijadwalkan pada jam kerja, 09:00–17:00.',
            ]);
        }

        // Bertabrakan dengan appointment lain? Dibandingkan sebagai rentang
        // selama durasi pertemuan, bukan kecocokan jam persis — menawarkan
        // 10:15 saat sudah ada pertemuan 10:00 tetap tumpang tindih.
        $bentrok = Appointment::whereIn('status', self::STATUS_MENEMPATI)
            ->whereRaw(Appointment::SQL_TGL_BERLAKU . ' = ?', [$tanggal->toDateString()])
            ->when($kecualiId, fn ($q) => $q->where('id', '!=', $kecualiId))
            ->get()
            ->first(function ($a) use ($menit) {
                $b = $a->jadwalBerlaku();
                if (! $b) {
                    return false;
                }
                $m = self::keMenit($b['jam'], 0);
                return $menit < $m + self::MENIT && $menit + self::MENIT > $m;
            });

        if ($bentrok) {
            throw ValidationException::withMessages([
                $fieldJam => 'Jam ini bertabrakan dengan pertemuan lain yang sudah terjadwal. Pilih jam lain.',
            ]);
        }

        // Tim sedang bertugas di acara? Jendela sibuknya memakai loading in/out.
        foreach (self::terhalangEvent($tanggal->toDateString()) as $slot) {
            $m = self::keMenit($slot, 0);
            if ($menit < $m + self::MENIT && $menit + self::MENIT > $m) {
                throw ValidationException::withMessages([
                    $fieldJam => 'Jam ini bertepatan dengan jadwal acara, tim sedang bertugas. Pilih jam lain.',
                ]);
            }
        }
    }

    /**
     * Periksa kelayakan satu slot: bukan Minggu, di dalam jam kerja, tidak
     * dipakai appointment lain, dan tidak bertabrakan dengan jadwal acara.
     *
     * Nama kolom error dibuat parameter supaya pesannya muncul di kolom yang
     * benar pada tiap form — "jam_request" saat klien memesan, "usulan_jam" pada
     * form usulan, "jam_konfirmasi" saat tim mengonfirmasi.
     */
    public static function periksa(
        string $tgl,
        string $jam,
        ?int $kecualiId = null,
        string $fieldTgl = 'tgl_request',
        string $fieldJam = 'jam_request',
    ): void {
        if (Carbon::parse($tgl)->isSunday()) {
            throw ValidationException::withMessages([
                $fieldTgl => 'Hari Minggu libur. Pilih hari Senin–Sabtu.',
            ]);
        }

        if (! in_array(substr($jam, 0, 5), self::kerja(), true)) {
            throw ValidationException::withMessages([
                $fieldJam => 'Pilih jam dari slot yang tersedia (09:00–16:30, selang 1,5 jam).',
            ]);
        }

        if (self::ditempatiAppointment($tgl, $jam, $kecualiId)) {
            throw ValidationException::withMessages([
                $fieldJam => 'Slot waktu ini sudah dipakai appointment lain. Silakan pilih jam lain.',
            ]);
        }

        if (in_array(substr($jam, 0, 5), self::terhalangEvent($tgl), true)) {
            throw ValidationException::withMessages([
                $fieldJam => 'Jam ini bertepatan dengan jadwal acara kami, sehingga belum bisa untuk meeting. Silakan pilih jam lain.',
            ]);
        }
    }
}
