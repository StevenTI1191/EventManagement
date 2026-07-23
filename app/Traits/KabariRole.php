<?php

namespace App\Traits;

use App\Models\Pegawai;
use Illuminate\Support\Facades\Mail;

/**
 * Kirim email pemberitahuan ke semua pegawai berdasarkan posisinya (role).
 * Dipakai untuk mengalirkan alur pembatalan antar-peran: Klien → Manajemen →
 * Finance. Tabel Notifikasi hanya untuk klien, jadi staf internal dikabari via
 * email. Kegagalan kirim hanya dicatat ke log — tak menggagalkan aksi utama.
 */
trait KabariRole
{
    protected function kabariRole(string $posisi, string $subjek, string $isi): void
    {
        $norm   = strtolower(str_replace(' ', '', $posisi));
        $emails = Pegawai::whereRaw("LOWER(REPLACE(posisi_pegawai,' ','')) = ?", [$norm])
            ->pluck('email_pegawai')->filter()->unique()->values()->all();

        foreach ($emails as $email) {
            try {
                Mail::raw($isi, fn ($m) => $m->to($email)->subject($subjek));
            } catch (\Exception $e) {
                \Log::warning("Email ke {$posisi} gagal: " . $e->getMessage());
            }
        }
    }
}
