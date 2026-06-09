<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SecurityHeaders — tambahkan HTTP security headers ke setiap response.
 *
 * Header ini adalah lapisan pertahanan pertama terhadap:
 *  - Clickjacking (X-Frame-Options / frame-ancestors)
 *  - MIME sniffing (X-Content-Type-Options)
 *  - Referrer leakage (Referrer-Policy)
 *  - Akses kamera / mikrofon tanpa izin (Permissions-Policy)
 *  - Injeksi melalui <base>, <form>, <object> (Content-Security-Policy)
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // --- 1. Clickjacking protection ---
        // frame-ancestors di CSP sudah cukup untuk browser modern,
        // X-Frame-Options tetap disertakan untuk browser lama.
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // --- 2. MIME sniffing protection ---
        // Cegah browser menebak tipe konten file yang di-serve.
        // Penting terutama untuk route /bukti-pembayaran dan /kontrak.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // --- 3. Referrer Policy ---
        // Kirimin origin saat navigasi same-origin, hanya origin (tanpa path)
        // untuk cross-origin. Mencegah URL sensitif (termasuk token password-reset)
        // bocor ke situs eksternal melalui Referer header.
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // --- 4. Permissions Policy ---
        // Matikan akses ke kamera, mikrofon, dan geolokasi secara eksplisit.
        // Aplikasi ini tidak membutuhkan ketiga browser API tersebut.
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        );

        // --- 5. XSS Protection ---
        // Set ke 0 — browser modern sudah punya proteksi sendiri.
        // Nilai "1; mode=block" justru bisa menciptakan celah di IE lama.
        $response->headers->set('X-XSS-Protection', '0');

        // --- 6. Content-Security-Policy ---
        // Di local dev, Vite berjalan di http://localhost:5173 (juga [::1]:5173).
        // Script dan HMR websocket dari dev server harus diizinkan.
        // Di production, Vite sudah di-bundle ke 'self' jadi tidak perlu origin tambahan.
        $viteOrigins = app()->environment('local', 'development')
            ? ' http://localhost:5173 http://127.0.0.1:5173'
            : '';

        $csp = implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'{$viteOrigins}",
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "img-src 'self' data: https:",
            "font-src 'self' data: https://fonts.bunny.net",
            "connect-src 'self' wss: ws:{$viteOrigins} https:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
        ]);
        $response->headers->set('Content-Security-Policy', $csp);

        // --- 7. HSTS (production only) ---
        // Paksa HTTPS selama 1 tahun. Hanya diaktifkan di production agar
        // development di HTTP localhost tidak terblokir.
        if (app()->environment('production')) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        return $response;
    }
}
