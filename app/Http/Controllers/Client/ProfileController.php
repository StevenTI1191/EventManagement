<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index()
    {
        $client = Auth::guard('client')->user();

        return Inertia::render('Client/Profile', [
            'auth'         => ['user' => $client],
            'has_password' => !is_null($client->password),
        ]);
    }

    public function update(Request $request)
    {
        $client = Auth::guard('client')->user();

        $rules = [
            'nama_client'       => 'required|string|max:255',
            'no_telp_client'    => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'tipe_client'       => 'required|in:Perorangan,Perusahaan',
            'perusahaan_client' => 'required_if:tipe_client,Perusahaan|nullable|string|max:255',
            'email_client'      => ['required', 'email', Rule::unique('clients', 'email_client')->ignore($client->id)],
            'password'          => 'nullable|string|min:8|max:255|confirmed',
        ];

        // Only require current_password when changing password and account already has one
        if ($request->filled('password') && !is_null($client->password)) {
            $rules['current_password'] = 'required|string';
        }

        $request->validate($rules);

        // Verify current password if account has one
        if ($request->filled('password') && !is_null($client->password)) {
            if (!Hash::check($request->current_password, $client->password)) {
                return back()->withErrors([
                    'current_password' => 'Password saat ini tidak sesuai.',
                ]);
            }
        }

        $data = $request->only(['nama_client', 'no_telp_client', 'tipe_client', 'perusahaan_client', 'email_client']);
        // Perorangan tidak menyimpan nama perusahaan.
        if ($request->tipe_client === 'Perorangan') {
            $data['perusahaan_client'] = null;
        }

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        // Alamat lama disimpan SEBELUM perubahan — sesudahnya sudah tertimpa.
        $emailLama    = $client->email_client;
        $emailBerubah = $data['email_client'] !== $emailLama;
        $sandiBerubah = $request->filled('password');

        $client->update($data);

        // Penanda "ingat saya" ikut diganti setiap kali kata sandinya berubah,
        // sama seperti pada alur lupa kata sandi. Tanpa ini kuki yang sudah
        // terlanjur berpindah tangan tetap berlaku, padahal mengganti kata
        // sandi dari halaman profil justru tindakan pertama orang yang menduga
        // akunnya dipakai orang lain.
        //
        // WAJIB lewat setRememberToken(), bukan ikut $data: kolomnya tidak ada
        // pada daftar $fillable sehingga pengisian massal dibuang diam-diam.
        if ($sandiBerubah) {
            $client->setRememberToken(\Illuminate\Support\Str::random(60));
            $client->save();
        }

        // Alamat email adalah identitas masuk SEKALIGUS tujuan tautan atur ulang
        // kata sandi. Menggantinya berarti memindahkan kedua-duanya, jadi alamat
        // LAMA harus diberi tahu — kalau perubahannya bukan dari pemiliknya,
        // pemberitahuan inilah satu-satunya kesempatan ia mengetahuinya.
        if ($emailBerubah && filled($emailLama)) {
            try {
                \Illuminate\Support\Facades\Mail::to($emailLama)->send(new \App\Mail\PesanSistem(
                    judul:    'Alamat Email Akun Diubah',
                    ikon:     '⚠️',
                    nada:     'jingga',
                    sapaan:   'Halo, ' . ($client->nama_client ?? 'Klien') . '!',
                    paragraf: [
                        'Alamat email pada akun Anda baru saja diubah dari ' . $emailLama
                        . ' menjadi ' . $client->email_client . '.',
                        'Mulai sekarang, alamat baru itulah yang dipakai untuk masuk dan menerima '
                        . 'tautan pengaturan ulang kata sandi.',
                    ],
                    penutup:  'Bila perubahan ini bukan Anda yang melakukannya, segera hubungi tim '
                        . 'kami agar akun Anda dapat dipulihkan.',
                    subjek:   'Alamat email akun diubah',
                ));
            } catch (\Exception $e) {
                \Log::warning('Email pemberitahuan pergantian alamat gagal: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Profil berhasil diperbarui.');
    }
}
