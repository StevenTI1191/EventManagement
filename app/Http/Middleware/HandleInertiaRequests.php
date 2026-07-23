<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user('pegawai') ?? $request->user('client') ?? null,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'warning' => session('warning'),
            ],
            // Angka lencana sidebar (mis. jumlah pengajuan yang perlu ditinjau).
            // Dihitung hemat: hanya untuk peran yang relevan.
            'badges' => $this->badgesFor($request),
        ];
    }

    /** Lencana per-peran untuk menu backstage. Kosong bila tak relevan. */
    private function badgesFor(Request $request): array
    {
        $pegawai = $request->user('pegawai');
        if (! $pegawai) {
            return [];
        }

        $posisi = strtolower(str_replace(' ', '', (string) $pegawai->posisi_pegawai));
        $badges = [];

        if ($posisi === 'manajemen') {
            $badges['pembatalanMenunggu'] = \App\Models\EventPembatalan::where(
                'status', \App\Models\EventPembatalan::STATUS_DIAJUKAN
            )->count();
        }

        return $badges;
    }
}
