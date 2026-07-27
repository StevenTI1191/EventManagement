<?php

/**
 * Identitas & data pembayaran perusahaan.
 *
 * Ditaruh di config (bukan ditulis langsung pada blade/JSX) karena nomor
 * rekening dan nilai fasilitas venue adalah data yang bisa berubah tanpa
 * perubahan alur — cukup ganti .env di server, tanpa membangun ulang kode.
 */
return [

    'nama' => env('PERUSAHAAN_NAMA', 'PT Laksamana Muda Bersatu'),

    /*
    |--------------------------------------------------------------------------
    | Rekening tujuan pembayaran
    |--------------------------------------------------------------------------
    | Dicantumkan pada dokumen invoice dan panel pembayaran di portal klien,
    | supaya klien tidak perlu menanyakan ke mana harus mentransfer.
    */
    'bank' => [
        'nama'      => env('BANK_NAMA', 'UOB'),
        'rekening'  => env('BANK_REKENING', '319 303 3588'),
        'atas_nama' => env('BANK_ATAS_NAMA', 'PT Laksamana Muda Bersatu'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Venue
    |--------------------------------------------------------------------------
    | Nilai fasilitas yang disediakan tanpa biaya tambahan — dipakai sebagai
    | sorotan pada halaman depan klien. Isi 0 untuk menyembunyikan nominalnya.
    */
    'venue' => [
        'nilai_fasilitas' => (int) env('VENUE_NILAI_FASILITAS', 45000000),
    ],

];
