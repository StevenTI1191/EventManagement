<?php

namespace App\Traits;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Auth;

trait ChecksPegawaiRole
{
    protected function checkManajemen(): void
    {
        $this->ensurePegawaiRole(['Manajemen']);
    }

    protected function checkEventMarketing(): void
    {
        $this->ensurePegawaiRole(['EventMarketing', 'Event Marketing']);
    }

    protected function checkFinance(): void
    {
        $this->ensurePegawaiRole(['Finance']);
    }

    /**
     * Pastikan pegawai yang login termasuk salah satu role yang diizinkan.
     * Pencocokan toleran spasi & kapital (mis. "event marketing" == "EventMarketing").
     * Kalau tidak cocok: JANGAN buntu di 403 — alihkan ke dashboard role-nya sendiri.
     *
     * Kecocokan posisi saja TIDAK cukup, jenisnya harus Internal pula — lihat
     * Pegawai::berperan(). Posisi pegawai eksternal adalah teks bebas, sehingga
     * tenaga lepas yang jabatannya kebetulan ditulis sama dengan salah satu
     * peran backstage akan memperoleh seluruh modul peran itu.
     */
    protected function ensurePegawaiRole(array $allowed): void
    {
        $pegawai = Auth::guard('pegawai')->user();

        if ($pegawai && $pegawai->berperan(...$allowed)) {
            return; // cocok → lanjut
        }

        // Pegawai eksternal tidak punya dashboard backstage mana pun. Mengarahkannya
        // menurut posisi justru memutar: tujuannya memeriksa peran yang sama lalu
        // memantulkannya kembali ke sini tanpa henti.
        $tujuan = $pegawai && $pegawai->berperan(...\App\Models\Pegawai::PERAN_INTERNAL)
            ? $this->dashboardUrlFor(\App\Models\Pegawai::normalPeran($pegawai->posisi_pegawai))
            : url('/');

        throw new HttpResponseException(redirect()->to($tujuan));
    }

    /**
     * URL dashboard sesuai role pegawai (versi ter-normalisasi).
     * Default ke beranda backstage (login) bila role tak dikenal.
     */
    protected function dashboardUrlFor(string $normalizedPosisi): string
    {
        return match ($normalizedPosisi) {
            'manajemen'      => route('manajemen.dashboard'),
            'eventmarketing' => route('event.dashboard'),
            'finance'        => route('finance.dashboard'),
            default          => url('/'),
        };
    }
}
