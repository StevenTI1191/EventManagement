<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Keterangan selisih waktu ditulis dalam Bahasa Indonesia. Tanpa ini
        // diffForHumans() menghasilkan "15 minutes" di tengah halaman yang
        // seluruhnya berbahasa Indonesia, misalnya pada antrean Persetujuan
        // Penawaran dan Negosiasi Klien.
        \Carbon\Carbon::setLocale('id');
    }
}
