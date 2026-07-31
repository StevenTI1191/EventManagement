<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientResetPassword extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $resetUrl,
        public string $namaClient,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '🔑 Reset Password — Laksamana Muda');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.kerangka', with: [
            'judul'    => 'Atur Ulang Kata Sandi',
            'subjudul' => 'Permintaan dari akun Anda',
            'ikon'     => '🔑',
            'nada'     => 'biru',
            'sapaan'   => 'Halo, ' . $this->namaClient . '!',
            'paragraf' => [
                'Kami menerima permintaan pengaturan ulang kata sandi untuk akun Anda. Tekan tombol di bawah untuk membuat kata sandi baru.',
                'Tautan ini berlaku selama 60 menit.',
            ],
            'tombol'   => ['label' => 'Atur Kata Sandi Baru', 'url' => $this->resetUrl],
            'penutup'  => 'Bila Anda tidak merasa meminta hal ini, abaikan saja surel ini — kata sandi Anda tidak akan berubah.',
            'detail'   => [], 'sorotan' => null, 'catatan' => null,
        ]);
    }
}
