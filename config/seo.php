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
    'legal_name'  => 'Laksamana Muda — Event Organizer & Live Space',
    'tagline'     => 'Event Organizer & Cafe Live Space (Bebas Alkohol) — Pekanbaru',

    // Deskripsi default (≤ 160 karakter ideal untuk hasil search)
    'description' => 'Laksamana Muda — Event Organizer & cafe live space bebas alkohol di Pekanbaru, Riau. '
        . 'Musik live, tempat nongkrong nyaman, dan jasa penyelenggara acara profesional.',

    // ── URL & gambar ────────────────────────────────────────────────────
    // URL utama situs client (tanpa trailing slash)
    'url'      => 'https://' . env('APP_DOMAIN', 'laksamanamuda.my.id'),
    // Logo untuk structured data
    'logo'     => '/images/LaksamanaLogo.png',
    // Gambar preview saat link di-share (idealnya 1200x630). Ganti bila ada banner.
    'og_image' => '/images/LaksamanaLogo.png',

    // ── Kontak (data resmi) ─────────────────────────────────────────────
    'phone'   => '+62 853-6523-4898',
    'email'   => 'contactus@laksamanamuda.com',

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
