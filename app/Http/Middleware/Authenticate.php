<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        // Inertia dan JSON request cukup terima 401 — tidak perlu redirect
        if ($request->header('X-Inertia') || $request->expectsJson()) {
            return null;
        }

        // Jika request berasal dari domain client, arahkan ke client login.
        // Tanpa ini, client yang session-nya habis akan di-redirect ke halaman
        // login pegawai (backstage domain) — wrong domain bug.
        $clientDomain = config('app.domain');
        if ($clientDomain && str_contains($request->getHost(), $clientDomain)) {
            return route('client.login');
        }

        // Fallback: halaman login pegawai (backstage)
        return route('login');
    }
}
