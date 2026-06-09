<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event $event,
        public int $hariLagi
    ) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->event->nama_event);
        return new Envelope(
            subject: "⏰ Reminder: {$this->hariLagi} Hari Lagi — {$namaEvent}"
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.event-reminder');
    }
}
