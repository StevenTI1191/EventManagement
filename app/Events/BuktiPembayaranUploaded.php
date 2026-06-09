<?php

namespace App\Events;

use App\Models\Notifikasi;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BuktiPembayaranUploaded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Notifikasi $notifikasi;

    public function __construct(Notifikasi $notifikasi)
    {
        $this->notifikasi = $notifikasi;
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('finance');
    }

    public function broadcastAs(): string
    {
        return 'bukti.uploaded';
    }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->notifikasi->id,
            'judul'        => $this->notifikasi->judul,
            'pesan'        => $this->notifikasi->pesan,
            'tipe'         => $this->notifikasi->tipe,
            'reference_id' => $this->notifikasi->reference_id,
            'is_read'      => false,
            'created_at'   => $this->notifikasi->created_at->toISOString(),
        ];
    }
}
