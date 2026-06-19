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
     */
    protected function ensurePegawaiRole(array $allowed): void
    {
        $posisi = Auth::guard('pegawai')->user()?->posisi_pegawai;

        $norm = static fn ($s) => strtolower(str_replace(' ', '', trim((string) $s)));
        $current = $norm($posisi);

        foreach ($allowed as $role) {
            if ($norm($role) === $current) {
                return; // cocok → lanjut
            }
        }

        // Role tidak cocok → arahkan ke dashboard miliknya, bukan layar 403 buntu.
        throw new HttpResponseException(
            redirect()->to($this->dashboardUrlFor($current))
        );
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
