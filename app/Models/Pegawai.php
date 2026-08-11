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

    public const JENIS_INTERNAL  = 'Internal';
    public const JENIS_EKSTERNAL = 'Eksternal';

    /** Tiga peran backstage. Hanya pegawai INTERNAL boleh memegangnya. */
    public const PERAN_INTERNAL = ['Manajemen', 'EventMarketing', 'Finance'];

    /** Samakan penulisan peran: tanpa spasi, tanpa beda huruf besar-kecil. */
    public static function normalPeran(?string $s): string
    {
        return strtolower(str_replace(' ', '', trim((string) $s)));
    }

    /**
     * Pegawai ini benar-benar memegang salah satu peran backstage.
     *
     * Kewenangan backstage menuntut DUA hal sekaligus: jenisnya Internal, dan
     * posisinya cocok. Memeriksa posisi saja tidak cukup — posisi pegawai
     * EKSTERNAL adalah teks bebas (aturannya hanya `string|max:255`, sebab
     * jabatan freelancer memang bermacam-macam), sehingga seorang tenaga lepas
     * yang jabatannya kebetulan ditulis "Finance" akan lolos pemeriksaan yang
     * hanya membaca posisinya. Ia lalu memperoleh seluruh modul Finance:
     * buku kas, verifikasi bukti pembayaran, dan laporan keuangan.
     *
     * @param string ...$peran salah satu dari PERAN_INTERNAL
     */
    public function berperan(string ...$peran): bool
    {
        if (self::normalPeran($this->jenis_pegawai) !== self::normalPeran(self::JENIS_INTERNAL)) {
            return false;
        }

        $punya = self::normalPeran($this->posisi_pegawai);

        foreach ($peran as $p) {
            if (self::normalPeran($p) === $punya) {
                return true;
            }
        }

        return false;
    }

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
