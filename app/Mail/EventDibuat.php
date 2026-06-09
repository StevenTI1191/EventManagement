<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventDibuat extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        $namaEvent = str_replace(["\r", "\n"], ' ', $this->event->nama_event);
        return new Envelope(subject: 'Event Anda Telah Dikonfirmasi — ' . $namaEvent);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.event-dibuat');
    }
}
