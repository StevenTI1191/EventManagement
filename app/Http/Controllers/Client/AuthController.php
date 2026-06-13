<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Client/Auth/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|max:255',
            'password' => 'required|string|max:255',
        ]);

        // Rate limit: per-email (5/menit) + per-IP (10/menit)
        $keyEmail = 'login.email.' . Str::lower($request->email);
        $keyIp    = 'login.ip.' . $request->ip();

        if (RateLimiter::tooManyAttempts($keyEmail, 5) ||
            RateLimiter::tooManyAttempts($keyIp, 10)) {
            $detik = max(
                RateLimiter::availableIn($keyEmail),
                RateLimiter::availableIn($keyIp)
            );
            return back()->withErrors([
                'email' => "Terlalu banyak percobaan login. Coba lagi dalam {$detik} detik.",
            ]);
        }

        $client = Client::where('email_client', $request->email)->first();

        // Akun Google-only
        if ($client && is_null($client->password)) {
            RateLimiter::hit($keyEmail, 60);
            RateLimiter::hit($keyIp, 60);
            return back()->withErrors([
                'email' => 'Akun ini menggunakan login Google. Gunakan tombol "Masuk dengan Google".',
            ]);
        }

        if ($client && Hash::check($request->password, $client->password)) {
            // Login berhasil → hapus rate limit
            RateLimiter::clear($keyEmail);
            RateLimiter::clear($keyIp);

            Auth::guard('client')->login($client, $request->boolean('remember'));
            $request->session()->regenerate();
            return redirect()->route('client.dashboard');
        }

        // Login gagal → tambah counter
        RateLimiter::hit($keyEmail, 60);
        RateLimiter::hit($keyIp, 60);

        return back()->withErrors(['email' => 'Email atau password salah.']);
    }

    public function showRegister()
    {
        return Inertia::render('Client/Auth/Register');
    }

    public function register(Request $request)
    {
        // Rate limiting: maks 10 pendaftaran per jam per IP
        $keyIp = 'register.ip.' . $request->ip();
        if (RateLimiter::tooManyAttempts($keyIp, 10)) {
            $seconds = RateLimiter::availableIn($keyIp);
            return back()->withErrors([
                'email_client' => "Terlalu banyak percobaan pendaftaran. Coba lagi dalam {$seconds} detik.",
            ]);
        }
        RateLimiter::hit($keyIp, 3600);

        $request->validate([
            'nama_client'       => 'required|string|min:3|max:255',
            'email_client'      => 'required|email|unique:clients,email_client',
            'password'          => 'required|min:8|max:255|confirmed',
            'no_telp_client'    => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'perusahaan_client' => 'required|string|max:255',
        ], [
            'nama_client.min'            => 'Nama minimal 3 karakter.',
            'no_telp_client.regex'       => 'Format nomor HP tidak valid.',
            'perusahaan_client.required' => 'Nama perusahaan wajib diisi.',
            'email_client.unique'        => 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.',
        ]);

        $client = Client::create([
            'nama_client'       => $request->nama_client,
            'email_client'      => $request->email_client,
            'password'          => Hash::make($request->password),
            'no_telp_client'    => $request->no_telp_client,
            'perusahaan_client' => $request->perusahaan_client,
        ]);

        Auth::guard('client')->login($client);
        $request->session()->regenerate();
        return redirect()->route('client.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::guard('client')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('client.login');
    }
}
