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
        'respon_klien',     // Diterima | Ditolak — respon klien atas penawaran
        'tgl_respon_klien',
        'tipe_event',       // Internal (dari Planning Event) | Eksternal (dari klien)
        'is_public',
        'deal_harga_event',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    protected static function booted(): void
    {
        // Event klien yang baru masuk Upcoming (DP lunas / bukti terverifikasi)
        // otomatis mendapat template to-do per divisi, supaya papan To-Do-List
        // tidak kosong saat divisi mulai bekerja. Dipasang di model agar berlaku
        // lewat jalur mana pun (invoice lunas, verifikasi bukti, ubah manual).
        static::updated(function (self $event) {
            if ($event->wasChanged('status_event')
                && $event->status_event === self::STATUS_UPCOMING
                && $event->tipe_event === self::TIPE_EKSTERNAL
                && ! $event->tugas()->exists()) {
                \App\Support\TugasTemplate::generate($event);
            }
        });
    }

    // ── Status ────────────────────────────────────────────────────────────────
    // Pipeline event EKSTERNAL: Lead -> Negotiation -> Deal -> (DP 50%) -> Upcoming -> Done
    public const STATUS_LEAD        = 'Lead';
    public const STATUS_NEGOTIATION = 'Negotiation';
    public const STATUS_DEAL        = 'Deal';
    // Event INTERNAL: Planning -> (finalisasi) -> Upcoming -> Done
    public const STATUS_PLANNING    = 'Planning';
    /**
     * Acara sudah berlangsung/lewat tanggalnya, tetapi belum tuntas — masih ada
     * tugas divisi berjalan (mis. bongkar) atau pelunasan belum masuk. Dibedakan
     * dari Upcoming (belum terjadi) maupun Done (benar-benar kelar).
     */
    public const STATUS_PENYELESAIAN = 'Penyelesaian';
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

    /** Semua status yang sah — dipakai validasi agar status pipeline tidak ditolak. */
    public const SEMUA_STATUS = [
        self::STATUS_LEAD, self::STATUS_NEGOTIATION, self::STATUS_DEAL,
        self::STATUS_PLANNING, self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN,
        self::STATUS_DONE, self::STATUS_BATAL,
    ];

    /** Status yang boleh diubah manual lewat form Event. */
    public const STATUS_MANUAL = [self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN, self::STATUS_DONE];

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
    public function scopeTerkonfirmasi($q) { return $q->whereIn('status_event', [self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN, self::STATUS_DONE]); }

    /** Event yang sudah masuk ranah Finance — mulai dari Deal (proses DP 50%). */
    public function scopeUntukFinance($q) { return $q->whereIn('status_event', [self::STATUS_DEAL, self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN, self::STATUS_DONE]); }

    /**
     * Event yang butuh dikerjakan divisi (papan Task Divisi): event internal yang
     * sedang direncanakan (Planning) dan event yang sudah berjalan (Upcoming, baik
     * internal maupun eksternal setelah DP lunas). Deal/Done/pipeline dikecualikan.
     */
    public function scopeTaskDivisi($q)
    {
        return $q->where(function ($w) {
            // Penyelesaian ikut tampil: acara sudah lewat tapi pekerjaan divisi
            // belum kelar — jangan sampai sisa pekerjaan hilang dari papan.
            $w->whereIn('status_event', [self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN])
              ->orWhere(function ($i) {
                  $i->where('tipe_event', self::TIPE_INTERNAL)
                    ->where('status_event', self::STATUS_PLANNING);
              });
        });
    }

    /** Semua tugas event ini sudah Done (dipakai untuk menutup event). */
    public function tugasTuntas(): bool
    {
        return ! $this->tugas()->where('status_tugas', '!=', 'Done')->exists();
    }

    /** Pembayaran sudah menutup nilai kesepakatan. */
    public function pembayaranLunas(): bool
    {
        $deal = (float) ($this->deal_harga_event ?? 0);

        return $deal <= 0
            || (float) $this->transaksis()->sum('nominal') >= $deal;
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
    /**
     * Jeda wajib (menit) sebelum & sesudah acara di area yang sama, untuk
     * setup dan bongkar. Mencegah dua acara dijadwalkan mepet sehingga
     * mustahil dikerjakan tim di lapangan.
     */
    public const BUFFER_JADWAL_MENIT = 180;

    /**
     * Cek bentrok jadwal pada satu area.
     *
     * Memperhitungkan acara MULTI-HARI (tgl_selesai_event) — bukan hanya tanggal
     * mulai — dan menambahkan buffer setup/bongkar di kedua ujung rentang.
     * Dua acara dianggap bentrok bila rentang waktunya (plus buffer) beririsan.
     *
     * Event Done & Batal dikecualikan: jadwalnya dilepas agar slot bisa dipakai
     * lagi. Penyelesaian TETAP memblokir karena tim mungkin masih di lokasi.
     */
    public static function checkBentrok($tgl, $jam_mulai, $jam_selesai, $area, $exclude_id = null, $tgl_selesai = null): ?self
    {
        $mulai   = \Illuminate\Support\Carbon::parse($tgl . ' ' . $jam_mulai);
        $selesai = \Illuminate\Support\Carbon::parse(($tgl_selesai ?: $tgl) . ' ' . $jam_selesai);

        // Acara lintas tengah malam (mis. 20:00–02:00) — akhir dianggap besoknya.
        if ($selesai->lessThanOrEqualTo($mulai)) {
            $selesai->addDay();
        }

        $batasAwal  = $mulai->copy()->subMinutes(self::BUFFER_JADWAL_MENIT);
        $batasAkhir = $selesai->copy()->addMinutes(self::BUFFER_JADWAL_MENIT);

        $query = self::where('area_event', $area)
            ->whereNotIn('status_event', [self::STATUS_DONE, self::STATUS_BATAL])
            ->whereRaw(
                "CAST(CONCAT(tgl_mulai_event, ' ', jam_mulai) AS DATETIME) < ?",
                [$batasAkhir->toDateTimeString()]
            )
            ->whereRaw(
                "CAST(CONCAT(COALESCE(tgl_selesai_event, tgl_mulai_event), ' ', jam_selesai) AS DATETIME) > ?",
                [$batasAwal->toDateTimeString()]
            );

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
