<?php

namespace App\Traits;

use App\Mail\PesanSistem;
use App\Models\Pegawai;
use Illuminate\Support\Facades\Mail;

/**
 * Kirim email pemberitahuan ke semua pegawai berdasarkan posisinya (role).
 * Dipakai untuk mengalirkan alur antar-peran: Klien → Event Marketing →
 * Finance → Manajemen. Tabel Notifikasi hanya untuk klien, jadi staf internal
 * dikabari via email. Nama posisi dicocokkan tanpa spasi & tanpa beda huruf
 * besar-kecil, jadi "EventMarketing" dan "Event Marketing" sama.
 * Kegagalan kirim hanya dicatat ke log — tak menggagalkan aksi utama.
 */
trait KabariRole
{
    /**
     * @param  string  $subjek  boleh diawali emoji — dipakai sebagai ikon surel
     * @param  string  $isi     baris pertama menjadi paragraf pembuka
     * @param  array<string,string>  $detail  rincian label => nilai (opsional)
     */
    protected function kabariRole(
        string $posisi,
        string $subjek,
        string $isi,
        array $detail = [],
        ?string $nada = null,
        ?array $tombol = null,
    ): void {
        $norm   = strtolower(str_replace(' ', '', $posisi));
        $emails = Pegawai::whereRaw("LOWER(REPLACE(posisi_pegawai,' ','')) = ?", [$norm])
            ->pluck('email_pegawai')->filter()->unique()->values()->all();

        if (! $emails) {
            return;
        }

        // Emoji di awal subjek dijadikan ikon pada kepala surel, lalu dibuang
        // dari judulnya supaya tidak tampil dua kali.
        [$ikon, $judul] = self::pisahIkon($subjek);

        // Paragraf dipisah pada baris kosong: penulisnya sudah menyusun isi
        // sebagai beberapa alinea, dan itu dipertahankan apa adanya.
        $paragraf = array_values(array_filter(array_map('trim', preg_split("/\n\s*\n/", trim($isi)))));

        $mailable = new PesanSistem(
            judul:    $judul,
            paragraf: $paragraf,
            detail:   $detail,
            subjudul: 'Pemberitahuan untuk ' . $posisi,
            ikon:     $ikon ?: '🔔',
            nada:     $nada ?: self::nadaDari($subjek),
            tombol:   $tombol,
            subjek:   $judul,
        );

        foreach ($emails as $email) {
            try {
                Mail::to($email)->send($mailable);
            } catch (\Exception $e) {
                \Log::warning("Email ke {$posisi} gagal: " . $e->getMessage());
            }
        }
    }

    /** Ambil emoji pembuka dari sebuah judul, bila ada. */
    private static function pisahIkon(string $teks): array
    {
        if (preg_match('/^([\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]+)\s*(.*)$/u', trim($teks), $m)) {
            return [trim($m[1]), trim($m[2])];
        }

        return ['', trim($teks)];
    }

    /**
     * Warna surel supaya kabar buruk tidak tampil dengan warna yang sama seperti
     * kabar baik.
     *
     * Ikon dipakai lebih dulu karena pemanggilnya memang sudah memilih emoji
     * yang mewakili nada pesannya — jauh lebih tepat daripada meraba kata kunci.
     * Kata kunci judul hanya menjadi cadangan bila subjeknya tanpa emoji.
     */
    private static function nadaDari(string $subjek): string
    {
        [$ikon, $judul] = self::pisahIkon($subjek);

        $dariIkon = [
            '❌' => 'merah',  '⏰' => 'merah',  '🚫' => 'merah',
            '✅' => 'hijau',  '🎉' => 'hijau',
            '🔄' => 'jingga', '🔧' => 'jingga', '⏳' => 'jingga',
            '📝' => 'biru',   '💬' => 'biru',   '📅' => 'biru',   '📋' => 'biru',
        ];

        foreach ($dariIkon as $emoji => $nada) {
            if ($ikon !== '' && str_contains($ikon, $emoji)) {
                return $nada;
            }
        }

        $t = mb_strtolower($judul);

        return match (true) {
            str_contains($t, 'batal') || str_contains($t, 'tolak')
                || str_contains($t, 'diperbaiki') || str_contains($t, 'lewat jatuh tempo') => 'merah',
            str_contains($t, 'disetujui') || str_contains($t, 'diterima')
                || str_contains($t, 'lunas') || str_contains($t, 'disepakati') => 'hijau',
            str_contains($t, 'usul') || str_contains($t, 'ganti tanggal') => 'jingga',
            str_contains($t, 'menunggu') || str_contains($t, 'persetujuan') => 'biru',
            default => 'emas',
        };
    }
}
