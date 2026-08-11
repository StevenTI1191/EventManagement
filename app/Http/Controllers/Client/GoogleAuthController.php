<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect()
    {
        // Stateful OAuth — state parameter dihasilkan otomatis dan disimpan di session.
        // Ini mencegah Login CSRF: tanpa state, penyerang bisa mengirim callback URL ke korban
        // dan memaksa korban login ke akun Google milik penyerang (account takeover).
        return Socialite::driver('google')->redirect();
    }

    public function callback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->route('client.login')
                ->withErrors(['email' => 'Login Google gagal. Silakan coba lagi.']);
        }

        // Alamat email HARUS sudah diverifikasi Google sebelum dipakai.
        //
        // Alasannya ada pada langkah penautan di bawah: akun Google yang belum
        // dikenal dicari padanannya lewat EMAIL, lalu ditautkan ke akun klien
        // yang sudah ada. Penautan itulah yang membuat verifikasi menjadi
        // syarat — tanpa memeriksanya, siapa pun yang dapat membuat akun Google
        // beralamat email milik orang lain (hal yang mungkin pada domain
        // Workspace, sebab pengelolanya menetapkan sendiri alamat penggunanya)
        // akan langsung masuk ke akun klien tersebut beserta seluruh acara,
        // tagihan, dan dokumennya — tanpa pernah menyentuh kata sandinya.
        $terverifikasi = (bool) ($googleUser->user['email_verified']
            ?? $googleUser->user['verified_email']
            ?? false);

        if (blank($googleUser->email) || ! $terverifikasi) {
            return redirect()->route('client.login')->withErrors([
                'email' => 'Alamat email pada akun Google Anda belum terverifikasi, sehingga belum '
                    . 'dapat dipakai untuk masuk. Verifikasi dulu di akun Google Anda, atau masuk '
                    . 'memakai email dan kata sandi.',
            ]);
        }

        // Find by google_id
        $client = Client::where('google_id', $googleUser->id)->first();

        if (!$client) {
            // Find by email — link existing account
            $client = Client::where('email_client', $googleUser->email)->first();

            if ($client) {
                $client->update(['google_id' => $googleUser->id]);
            } else {
                // Create new client from Google data. Akun Google dianggap
                // Perorangan (belum ada data perusahaan) supaya tidak langsung
                // diminta mengisi nama perusahaan; bisa diubah ke Perusahaan
                // dari halaman profil.
                $client = Client::create([
                    'nama_client'  => $googleUser->name,
                    'email_client' => $googleUser->email,
                    'google_id'    => $googleUser->id,
                    'tipe_client'  => Client::TIPE_PERORANGAN,
                    'password'     => null,
                ]);
            }
        }

        Auth::guard('client')->login($client);
        request()->session()->regenerate();

        return redirect()->route('client.dashboard');
    }
}
