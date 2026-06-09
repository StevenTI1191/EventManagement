<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Halaman profil pegawai (read-only — tidak ada form edit saat ini).
     */
    public function edit(Request $request)
    {
        return Inertia::render('Profile/Edit', [
            'status' => session('status'),
        ]);
    }

    /**
     * Update profil pegawai.
     * Halaman profile saat ini read-only — endpoint ini belum digunakan frontend.
     * Kembalikan 404 agar tidak throw BadMethodCallException (500) jika URL diakses langsung.
     */
    public function update(Request $request)
    {
        abort(404);
    }

    /**
     * Pegawai tidak dapat menghapus akun sendiri — hanya Manajemen yang bisa melakukan ini.
     */
    public function destroy(Request $request)
    {
        abort(403, 'Akun pegawai hanya dapat dihapus oleh Manajemen.');
    }
}
