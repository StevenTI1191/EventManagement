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
        return new Content(view: 'emails.client-reset-password');
    }
}
