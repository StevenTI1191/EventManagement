<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Mail\ClientResetPassword;
use App\Models\Client;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ForgotPasswordController extends Controller
{
    /**
     * Satu jawaban untuk SETIAP alamat yang dikirimkan — terdaftar maupun
     * tidak, berkata-sandi maupun memakai Google.
     *
     * Jawaban yang berbeda-beda sudah cukup memberi tahu penebak alamat mana
     * yang terdaftar di sistem ini beserta cara masuknya, dan itu membatalkan
     * seluruh usaha menyamarkannya. Pemilik alamat yang sah tetap memperoleh
     * keterangan yang tepat lewat kotak masuknya, yang hanya dapat ia baca.
     */
    private const PESAN_NETRAL = 'Jika email terdaftar, link reset akan dikirim dalam beberapa menit. '
        . 'Cek inbox atau folder spam Anda.';

    public function showForgot()
    {
        return Inertia::render('Client/Auth/ForgotPassword');
    }

    public function sendLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // Rate limit: maks 5 percobaan per IP per 10 menit
        $key = 'forgot-password:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            $menit   = ceil($seconds / 60);
            return back()->withErrors([
                'email' => "Terlalu banyak percobaan. Silakan coba lagi dalam {$menit} menit.",
            ]);
        }
        RateLimiter::hit($key, 600); // window 10 menit

        $client = Client::where('email_client', $request->email)->first();

        // Jangan ungkapkan apakah email ada atau tidak — security best practice
        if (!$client) {
            return back()->with('success', self::PESAN_NETRAL);
        }

        // Akun Google-only tidak punya kata sandi untuk diatur ulang.
        //
        // Jawabannya sengaja DISAMAKAN dengan jawaban untuk email yang tidak
        // terdaftar. Beberapa baris di atas alamat yang tidak dikenal dijawab
        // dengan kalimat netral justru agar keberadaannya tidak terungkap;
        // membalas "akun ini terdaftar via Google" di sini membatalkan usaha
        // itu, sebab jawaban yang berbeda sudah cukup memberi tahu penebak
        // bahwa alamat tersebut TERDAFTAR sekaligus cara masuknya.
        //
        // Pemiliknya yang sah tetap terbantu: penjelasannya dikirim ke kotak
        // masuk alamat itu, yang hanya dapat dibaca pemiliknya.
        if (is_null($client->password) && $client->google_id) {
            try {
                Mail::to($client->email_client)->send(new \App\Mail\PesanSistem(
                    judul:    'Akun Anda Memakai Masuk dengan Google',
                    ikon:     '🔑',
                    nada:     'biru',
                    sapaan:   'Halo, ' . ($client->nama_client ?? 'Klien') . '!',
                    paragraf: [
                        'Kami menerima permintaan pengaturan ulang kata sandi untuk akun Anda.',
                        'Akun Anda terdaftar melalui Google, sehingga tidak memiliki kata sandi '
                        . 'yang dapat diatur ulang. Silakan masuk memakai tombol "Masuk dengan '
                        . 'Google" pada halaman masuk.',
                    ],
                    penutup:  'Bila permintaan ini bukan dari Anda, abaikan saja pesan ini — '
                        . 'tidak ada perubahan apa pun pada akun Anda.',
                    subjek:   'Akun Anda memakai masuk dengan Google',
                ));
            } catch (\Exception $e) {
                \Log::warning('Email pemberitahuan akun Google gagal dikirim: ' . $e->getMessage());
            }

            return back()->with('success', self::PESAN_NETRAL);
        }

        $token    = Str::random(64);
        // Gunakan domain client (bukan APP_URL yang bisa mengarah ke backstage)
        // Fallback ke APP_URL jika APP_DOMAIN belum diset di .env
        $clientDomain = config('app.domain') ?: parse_url(config('app.url'), PHP_URL_HOST);
        $scheme       = app()->environment('production') ? 'https' : 'http';
        $resetUrl     = $scheme . '://' . $clientDomain . '/reset-password'
                      . '?token=' . $token
                      . '&email=' . urlencode($request->email);

        DB::table('password_reset_tokens')->upsert([
            'email'      => $request->email,
            'token'      => Hash::make($token),
            'created_at' => now(),
        ], ['email']);

        try {
            Mail::to($client->email_client)
                ->send(new ClientResetPassword($resetUrl, $client->nama_client));
        } catch (\Exception $e) {
            \Log::warning('Email reset password gagal dikirim: ' . $e->getMessage());
            // Token tetap tersimpan — user bisa coba lagi
        }

        return back()->with('success', self::PESAN_NETRAL);
    }

    public function showReset(Request $request)
    {
        return Inertia::render('Client/Auth/ResetPassword', [
            'token' => $request->query('token'),
            'email' => $request->query('email'),
        ]);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'token'    => 'required',
            'email'    => 'required|email|max:255',
            'password' => 'required|min:8|max:255|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return back()->withErrors(['token' => 'Link tidak valid atau sudah digunakan.']);
        }

        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return back()->withErrors(['token' => 'Link sudah kadaluarsa (60 menit). Minta link baru.']);
        }

        $client = Client::where('email_client', $request->email)->firstOrFail();

        $client->update(['password' => Hash::make($request->password)]);

        // Penanda "ingat saya" ikut diganti. Halaman masuk menawarkan pilihan
        // itu, sehingga tanpa penggantian ini kuki yang sudah terlanjur
        // berpindah tangan TETAP berlaku sesudah kata sandinya diganti —
        // padahal justru dugaan akun disalahgunakan itulah yang biasanya
        // membuat orang mengatur ulang kata sandinya.
        //
        // Ditulis lewat setRememberToken(), BUKAN update(): kolomnya sengaja
        // tidak masuk daftar $fillable, sehingga pengisian massal akan dibuang
        // diam-diam dan penggantiannya tidak pernah terjadi.
        $client->setRememberToken(Str::random(60));
        $client->save();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return redirect()->route('client.login')
            ->with('success', 'Password berhasil diubah. Silakan masuk dengan password baru Anda.');
    }
}
