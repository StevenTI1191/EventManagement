<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Event extends Model
{
    protected $table = 'events';
    protected $primaryKey = 'id_event'; // Beritahu Laravel ID-nya bukan 'id' tapi 'id_event'

    protected $fillable = [
        'id_client',
        'id_pegawai',
        'nama_event',
        'kategori_event', // ← tambah ini
        'deskripsi_event',
        'tgl_mulai_event',
        'tgl_selesai_event',
        'jam_mulai',
        'jam_selesai',
        'jam_meeting',
        'jam_keluar_makanan',
        'area_event',
        'jumlah_pax',
        'harga_per_pax',
        'target_pax',
        'target_omset',
        'note_event',
        'food_beverage_event',
        'entairtainment_event',
        'poster_event',
        'kontrak_file',
        'technical_meeting',
        'gladi_resik',
        'status_event',
        'tipe_event',       // Internal (dari Planning Event) | Eksternal (dari klien)
        'is_public',
        'deal_harga_event',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    // ── Status ────────────────────────────────────────────────────────────────
    // Pipeline event EKSTERNAL: Lead -> Negotiation -> Deal -> (DP 50%) -> Upcoming -> Done
    public const STATUS_LEAD        = 'Lead';
    public const STATUS_NEGOTIATION = 'Negotiation';
    public const STATUS_DEAL        = 'Deal';
    // Event INTERNAL: Planning -> (finalisasi) -> Upcoming -> Done
    public const STATUS_PLANNING    = 'Planning';
    public const STATUS_UPCOMING    = 'Upcoming';
    public const STATUS_DONE        = 'Done';

    /**
     * Prospek yang tidak jadi. Event tetap disimpan (bukan dihapus) agar riwayat
     * dan alasan gagalnya bisa ditelusuri, tetapi ia keluar dari papan pipeline,
     * tidak muncul di kalender, dan tidak lagi mengunci jadwal.
     */
    public const STATUS_BATAL       = 'Batal';

    /** Kolom kanban pipeline (hanya untuk event eksternal). */
    public const PIPELINE_STATUSES = [self::STATUS_LEAD, self::STATUS_NEGOTIATION, self::STATUS_DEAL];

    public const TIPE_INTERNAL  = 'Internal';
    public const TIPE_EKSTERNAL = 'Eksternal';

    /** Event milik LMB sendiri (berasal dari Planning Event). */
    public function scopeInternal($q) { return $q->where('tipe_event', self::TIPE_INTERNAL); }

    /** Event dari klien (masuk lewat pipeline). */
    public function scopeEksternal($q) { return $q->where('tipe_event', self::TIPE_EKSTERNAL); }

    /** Event yang masih berada di papan pipeline (Lead/Negotiation/Deal). */
    public function scopePipeline($q) { return $q->whereIn('status_event', self::PIPELINE_STATUSES); }

    /**
     * Event "nyata" yang sudah lolos pipeline — dipakai daftar Event, dashboard,
     * dan Task Divisi. Planning (draft internal) dan pipeline (Lead/Negotiation/Deal)
     * sengaja dikecualikan agar calon event tidak bocor ke halaman operasional.
     */
    public function scopeTerkonfirmasi($q) { return $q->whereIn('status_event', [self::STATUS_UPCOMING, self::STATUS_DONE]); }

    /** Event yang sudah masuk ranah Finance — mulai dari Deal (proses DP 50%). */
    public function scopeUntukFinance($q) { return $q->whereIn('status_event', [self::STATUS_DEAL, self::STATUS_UPCOMING, self::STATUS_DONE]); }

    /**
     * Event yang butuh dikerjakan divisi (papan Task Divisi): event internal yang
     * sedang direncanakan (Planning) dan event yang sudah berjalan (Upcoming, baik
     * internal maupun eksternal setelah DP lunas). Deal/Done/pipeline dikecualikan.
     */
    public function scopeTaskDivisi($q)
    {
        return $q->where(function ($w) {
            $w->where('status_event', self::STATUS_UPCOMING)
              ->orWhere(function ($i) {
                  $i->where('tipe_event', self::TIPE_INTERNAL)
                    ->where('status_event', self::STATUS_PLANNING);
              });
        });
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'id_event', 'id_event');
    }

    public function client(): BelongsTo
    {
        // 'id_client' adalah foreign key di tabel events
        return $this->belongsTo(Client::class, 'id_client');
    }

    /**
     * Relasi ke Pegawai (Satu Event punya satu PIC Pegawai)
     */
    public function pic(): BelongsTo
    {
        // 'id_pegawai' adalah foreign key di tabel events
        return $this->belongsTo(Pegawai::class, 'id_pegawai');
    }
    public static function checkBentrok($tgl, $jam_mulai, $jam_selesai, $area, $exclude_id = null): ?self
    {
        $query = self::where('tgl_mulai_event', $tgl)
            ->where('area_event', $area)
            ->where('jam_mulai', '<', $jam_selesai)
            ->where('jam_selesai', '>', $jam_mulai)
            // Event selesai tidak dihitung bentrok. Begitu pula prospek yang tidak
            // jadi — jadwalnya harus dilepas agar tanggal & area bisa dipakai lagi.
            ->whereNotIn('status_event', [self::STATUS_DONE, self::STATUS_BATAL]);

        if ($exclude_id) {
            $query->where('id_event', '!=', $exclude_id);
        }

        return $query->first();
    }
    public function tugas()
    {
        return $this->hasMany(Tugas::class, 'id_event', 'id_event');
    }
    public function transaksis()
    {
        return $this->hasMany(Transaksi::class, 'id_event', 'id_event');
    }
    public function transaksiItems()
    {
        return $this->hasMany(TransaksiItem::class, 'id_event', 'id_event');
    }
    public function buktiPembayaran()
    {
        return $this->hasMany(BuktiPembayaran::class, 'id_event');
    }
}
