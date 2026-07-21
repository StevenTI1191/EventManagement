<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Pembacaan bukti transfer (OCR Tesseract)
    |--------------------------------------------------------------------------
    |
    | OCR berjalan sinkron di dalam request unggah bukti. Di server kecil hal ini
    | bisa memperlambat unggahan; setel OCR_BUKTI_ENABLED=false untuk mematikannya
    | tanpa mengubah kode. Saat mati, bukti tetap tersimpan & diverifikasi manual
    | oleh Finance (OCR memang hanya membantu, bukan penentu).
    |
    */

    'enabled' => env('OCR_BUKTI_ENABLED', true),

    // Batas waktu proses Tesseract (detik). Melewati ini, proses dihentikan agar
    // tidak menggantung worker PHP. Butuh utilitas `timeout` (coreutils) di server.
    'timeout' => (int) env('OCR_BUKTI_TIMEOUT', 20),

    // Lewati berkas gambar yang lebih besar dari ini (byte) — foto beresolusi
    // tinggi paling lama diproses dan paling sering bikin request molor.
    'max_bytes' => (int) env('OCR_BUKTI_MAX_BYTES', 4 * 1024 * 1024),
];
