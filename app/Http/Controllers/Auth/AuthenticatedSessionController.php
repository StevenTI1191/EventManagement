<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/LoginPegawai', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|max:255',
            'password' => 'required|string|max:255',
        ]);

        // Rate limiting: per-email (5/menit) + per-IP (10/menit)
        // Dual-layer mencegah brute-force dari satu IP maupun distributed attack ke satu akun.
        $keyEmail = 'pegawai-login.email:' . Str::lower($request->email);
        $keyIp    = 'pegawai-login.ip:' . $request->ip();

        if (RateLimiter::tooManyAttempts($keyEmail, 5) || RateLimiter::tooManyAttempts($keyIp, 10)) {
            $seconds = max(RateLimiter::availableIn($keyEmail), RateLimiter::availableIn($keyIp));
            $menit   = ceil($seconds / 60);
            return back()->withErrors([
                'email' => "Terlalu banyak percobaan. Coba lagi dalam {$menit} menit.",
            ]);
        }

        $pegawai = \App\Models\Pegawai::where('email_pegawai', $request->email)->first();

        if ($pegawai && \Illuminate\Support\Facades\Hash::check($request->password, $pegawai->password_pegawai)) {
            RateLimiter::clear($keyEmail);
            RateLimiter::clear($keyIp);
            Auth::guard('pegawai')->login($pegawai);
            $request->session()->regenerate();

            return match($pegawai->posisi_pegawai) {
                'Manajemen'      => redirect()->route('manajemen.dashboard'),
                'EventMarketing' => redirect()->route('event.dashboard'),
                'Finance'        => redirect()->route('finance.dashboard'),
                default          => redirect('/')
            };
        }

        RateLimiter::hit($keyEmail, 600); // window 10 menit
        RateLimiter::hit($keyIp, 60);     // window 1 menit untuk IP
        return back()->withErrors(['email' => 'Data tidak ditemukan di sistem Laksamana Muda.']);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('pegawai')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
