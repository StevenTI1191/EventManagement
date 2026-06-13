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
            'perusahaan_client' => 'required|string|max:255',
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

        $data = $request->only(['nama_client', 'no_telp_client', 'perusahaan_client', 'email_client']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $client->update($data);

        return back()->with('success', 'Profil berhasil diperbarui.');
    }
}
