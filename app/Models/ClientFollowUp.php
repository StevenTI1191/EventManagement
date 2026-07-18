<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientFollowUp extends Model
{
    protected $table = 'client_follow_ups';

    protected $fillable = [
        'id_client',
        'id_pegawai',
        'id_event',
        'catatan',
        'tgl_berikutnya',
        'reminder_terkirim',
    ];

    protected $casts = [
        'tgl_berikutnya'    => 'date',
        'reminder_terkirim' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'id_client', 'id');
    }

    /** Event/prospek yang di-follow-up (opsional). */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai', 'id_pegawai');
    }
}
