<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventDokumentasi extends Model
{
    protected $table = 'event_dokumentasi';

    protected $fillable = [
        'id_event',
        'file_path',
        'keterangan',
        'urutan',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }
}
