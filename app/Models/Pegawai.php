<?php

namespace App\Models;

// Ganti Model standar menjadi Authenticatable
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Appointment;

class Pegawai extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'pegawais'; // Pastikan nama tabelnya benar
    protected $primaryKey = 'id_pegawai';

    protected $fillable = [
        'nama_pegawai',
        'jenis_pegawai',
        'posisi_pegawai',
        'no_hp_pegawai',
        'email_pegawai',
        'password_pegawai',
        'rekomendasi_rehire',
        'note_pegawai',
        'gaji_pokok', // ← tambahkan ini
    ];

    protected $hidden = [
        'password_pegawai',
        'remember_token', // Token sesi — jangan expose ke browser via Inertia page props
    ];

    // Beritahu Laravel kalau password-nya ada di kolom 'password_pegawai'
    public function getAuthPassword()
    {
        return $this->password_pegawai;
    }

    public function transaksis()
    {
        return $this->hasMany(Transaksi::class, 'id_pegawai');
    }
    public function events()
    {
        return $this->hasMany(Event::class, 'id_pegawai', 'id_pegawai');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'id_pegawai', 'id_pegawai');
    }
}
