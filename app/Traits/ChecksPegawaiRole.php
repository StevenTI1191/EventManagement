<?php

namespace App\Traits;

use Illuminate\Support\Facades\Auth;

trait ChecksPegawaiRole
{
    protected function checkManajemen(): void
    {
        if (Auth::guard('pegawai')->user()->posisi_pegawai !== 'Manajemen') {
            abort(403, 'Akses ditolak. Halaman ini hanya untuk Manajemen.');
        }
    }

    protected function checkEventMarketing(): void
    {
        $posisi = Auth::guard('pegawai')->user()->posisi_pegawai;
        if (!in_array($posisi, ['EventMarketing', 'Event Marketing'])) {
            abort(403, 'Akses ditolak. Halaman ini hanya untuk Event Marketing.');
        }
    }

    protected function checkFinance(): void
    {
        if (Auth::guard('pegawai')->user()->posisi_pegawai !== 'Finance') {
            abort(403, 'Akses ditolak. Halaman ini hanya untuk Finance.');
        }
    }
}
