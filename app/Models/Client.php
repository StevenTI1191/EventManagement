<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'nama_client',
        'perusahaan_client',
        'no_telp_client',
        'email_client',
        'google_id',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'google_id',      // Raw Google OAuth ID — tidak boleh terekspos ke browser
    ];

    protected $appends = ['has_google'];

    /**
     * Computed boolean: apakah akun ini terhubung dengan Google?
     * Frontend hanya perlu tahu true/false, bukan nilai raw google_id-nya.
     */
    public function getHasGoogleAttribute(): bool
    {
        return !is_null($this->google_id);
    }

    public function getAuthPassword()
    {
        return $this->password;
    }

    public function events()
    {
        return $this->hasMany(\App\Models\Event::class, 'id_client', 'id');
    }

    public function appointments()
    {
        return $this->hasMany(\App\Models\Appointment::class, 'client_id');
    }
    public function buktiPembayaran()
    {
        return $this->hasMany(BuktiPembayaran::class, 'client_id');
    }
}
