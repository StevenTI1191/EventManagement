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

        // Find by google_id
        $client = Client::where('google_id', $googleUser->id)->first();

        if (!$client) {
            // Find by email — link existing account
            $client = Client::where('email_client', $googleUser->email)->first();

            if ($client) {
                $client->update(['google_id' => $googleUser->id]);
            } else {
                // Create new client from Google data
                $client = Client::create([
                    'nama_client'  => $googleUser->name,
                    'email_client' => $googleUser->email,
                    'google_id'    => $googleUser->id,
                    'password'     => null,
                ]);
            }
        }

        Auth::guard('client')->login($client);
        request()->session()->regenerate();

        return redirect()->route('client.dashboard');
    }
}
