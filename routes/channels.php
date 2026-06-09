<?php

use App\Models\Pegawai;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Hanya EventMarketing yang boleh subscribe channel notifikasi appointment
Broadcast::channel('event-marketing', function (Pegawai $user) {
    return in_array($user->posisi_pegawai, ['EventMarketing', 'Event Marketing']);
}, ['guards' => ['pegawai']]);

// Hanya Finance yang boleh subscribe channel notifikasi bukti pembayaran
Broadcast::channel('finance', function (Pegawai $user) {
    return $user->posisi_pegawai === 'Finance';
}, ['guards' => ['pegawai']]);
