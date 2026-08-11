<?php

use App\Models\Pegawai;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/*
 * Wewenang kanal memakai Pegawai::berperan(), acuan yang sama dengan seluruh
 * halaman backstage.
 *
 * Sebelumnya keduanya hanya membaca posisi_pegawai. Posisi pegawai EKSTERNAL
 * adalah teks bebas, sehingga tenaga lepas yang jabatannya kebetulan ditulis
 * "Finance" dapat berlangganan kanal ini dan menerima setiap pemberitahuan
 * bukti pembayaran secara langsung — meskipun halaman Finance-nya sendiri sudah
 * tertutup baginya. Kanal siaran adalah permukaan wewenang tersendiri yang
 * tidak melewati controller, jadi ia harus dijaga terpisah pula.
 */

// Hanya EventMarketing yang boleh subscribe channel notifikasi appointment
Broadcast::channel('event-marketing', function (Pegawai $user) {
    return $user->berperan('EventMarketing');
}, ['guards' => ['pegawai']]);

// Hanya Finance yang boleh subscribe channel notifikasi bukti pembayaran
Broadcast::channel('finance', function (Pegawai $user) {
    return $user->berperan('Finance');
}, ['guards' => ['pegawai']]);
