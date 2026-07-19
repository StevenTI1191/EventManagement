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
        'sumber',           // Mandiri = daftar sendiri | Internal = di-input/di-approach EM
        'google_id',
        'password',
    ];

    public const SUMBER_MANDIRI  = 'Mandiri';
    public const SUMBER_INTERNAL = 'Internal';
    /**
     * Klien yang sebenarnya adalah PT Laksamana Muda sendiri — dipakai untuk
     * acara yang diselenggarakan sendiri, agar event internal tetap punya
     * pihak klien yang jelas tanpa dianggap prospek dari luar.
     */
    public const SUMBER_LM = 'Perusahaan Sendiri';

    public const SEMUA_SUMBER = [self::SUMBER_MANDIRI, self::SUMBER_INTERNAL, self::SUMBER_LM];

    /** Klien yang mendaftar sendiri lewat halaman registrasi. */
    public function scopeMandiri($q) { return $q->where('sumber', self::SUMBER_MANDIRI); }

    /** Klien yang di-input & di-approach sendiri oleh tim Event Marketing. */
    public function scopeInternal($q) { return $q->where('sumber', self::SUMBER_INTERNAL); }

    /** "Klien" yang sebenarnya PT Laksamana Muda sendiri (acara internal). */
    public function scopePerusahaanSendiri($q) { return $q->where('sumber', self::SUMBER_LM); }

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
    public function followUps()
    {
        return $this->hasMany(ClientFollowUp::class, 'id_client', 'id');
    }

    public function buktiPembayaran()
    {
        return $this->hasMany(BuktiPembayaran::class, 'client_id');
    }
}
