<?php

namespace App\Events;

use App\Models\Appointment;
use App\Models\Notifikasi;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;
    public $notifikasi;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;

        // Simpan ke database
        $this->notifikasi = Notifikasi::create([
            'judul'        => 'Appointment Baru',
            'pesan'        => 'Appointment baru dari ' . ($appointment->client?->nama_client ?? 'Client') . ' — ' . $appointment->jenis_event,
            'tipe'         => 'appointment',
            'reference_id' => $appointment->id,
            'is_read'      => false,
        ]);
    }

    public function broadcastOn()
    {
        return new PrivateChannel('event-marketing');
    }

    public function broadcastAs()
    {
        return 'appointment.created';
    }

    public function broadcastWith()
    {
        return [
            'id'             => $this->notifikasi->id,
            'judul'          => $this->notifikasi->judul,
            'pesan'          => $this->notifikasi->pesan,
            'tipe'           => $this->notifikasi->tipe,
            'reference_id'   => $this->notifikasi->reference_id,
            'is_read'        => $this->notifikasi->is_read,
            'created_at'     => $this->notifikasi->created_at->toISOString(),
        ];
    }
}
