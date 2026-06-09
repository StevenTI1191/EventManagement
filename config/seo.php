<?php

/*
|--------------------------------------------------------------------------
| SEO / Metadata Terpusat
|--------------------------------------------------------------------------
| Ubah data di sini → otomatis terpakai di <title>, meta description,
| Open Graph (preview share WA/IG/FB), Twitter Card, dan structured data
| JSON-LD (Google). Tidak perlu edit di banyak tempat.
|
| CATATAN: beberapa nilai masih PLACEHOLDER (telp/email/sosmed).
| Ganti dengan data asli saat sudah siap.
*/

return [

    // ── Identitas bisnis ────────────────────────────────────────────────
    'name'        => 'Laksamana Muda',
    'legal_name'  => 'Laksamana Muda Event Organizer',
    'tagline'     => 'Professional Event Organizer — Pekanbaru, Riau',

    // Deskripsi default (≤ 160 karakter ideal untuk hasil search)
    'description' => 'Laksamana Muda adalah Event Organizer profesional di Pekanbaru, Riau. '
        . 'Spesialis corporate event, wedding, konser musik, exhibition, dan private party.',

    // ── URL & gambar ────────────────────────────────────────────────────
    // URL utama situs client (tanpa trailing slash)
    'url'      => 'https://' . env('APP_DOMAIN', 'laksamanamuda.my.id'),
    // Logo untuk structured data
    'logo'     => '/images/LaksamanaLogo.png',
    // Gambar preview saat link di-share (idealnya 1200x630). Ganti bila ada banner.
    'og_image' => '/images/LaksamanaLogo.png',

    // ── Kontak (PLACEHOLDER — ganti dengan data asli) ───────────────────
    'phone'   => '+62 812-3456-7890',
    'email'   => 'info@laksamanamuda.co.id',

    // ── Alamat ──────────────────────────────────────────────────────────
    'address' => [
        'street'   => '',              // mis. 'Jl. Sudirman No. 123'
        'city'     => 'Pekanbaru',
        'region'   => 'Riau',
        'country'  => 'ID',
        'postal'   => '',              // mis. '28282'
    ],

    // Jam operasional (untuk teks; format Schema opsional)
    'hours' => 'Senin–Sabtu, 09.00–18.00 WIB',

    // ── Media sosial (PLACEHOLDER — isi URL profil asli) ────────────────
    // Dipakai sebagai "sameAs" di structured data (bantu Google verifikasi entitas)
    'social' => [
        // 'https://instagram.com/...',
        // 'https://facebook.com/...',
        // 'https://youtube.com/@...',
    ],

    // Locale untuk Open Graph
    'locale' => 'id_ID',
];
