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
        'loading_in',
        'loading_out',
        'jam_meeting',
        'jam_keluar_makanan',
        'area_event',
        'jumlah_pax',
        'harga_per_pax',
        'target_pax',
        'target_omset',
        'note_event',
        'jejak_event',
        'food_beverage_event',
        'entairtainment_event',
        'poster_event',
        'kontrak_file',
        'technical_meeting',
        'gladi_resik',
        'status_event',
        'respon_klien',     // Diterima | Ditolak — respon klien atas penawaran
        'tgl_respon_klien',
        // Persetujuan Manajemen atas penawaran sebelum dikirim ke klien.
        'penawaran_status',
        'penawaran_diajukan_oleh',
        'penawaran_diajukan_pada',
        'penawaran_ditinjau_oleh',
        'penawaran_ditinjau_pada',
        'penawaran_catatan',
        'tipe_event',       // Internal (dari Planning Event) | Eksternal (dari klien)
        'dari_planning',    // lahir dari Planning Event — penentu boleh punya target
        'is_public',
        'deal_harga_event',
    ];

    protected $casts = [
        'is_public'     => 'boolean',
        'dari_planning' => 'boolean',
        // Tanpa cast ini keduanya kembali sebagai string, dan pemanggilan
        // seperti optional($event->penawaran_diajukan_pada)?->format() gagal
        // diam-diam menjadi null alih-alih menampilkan tanggalnya.
        'penawaran_diajukan_pada' => 'datetime',
        'penawaran_ditinjau_pada' => 'datetime',
    ];

    /**
     * Target pax & omset hanya berlaku untuk acara yang melewati tahap
     * perencanaan — baik acara internal maupun rencana yang diajukan ke klien.
     * Prospek yang di-input langsung tidak pernah punya tahap itu, jadi isian
     * target tidak ditawarkan padanya.
     */
    public function bolehPunyaTarget(): bool
    {
        return (bool) $this->dari_planning;
    }

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

        // Baris anak (dokumentasi, bukti pembayaran, transaksi) terhapus sendiri
        // lewat cascade di basis data, tetapi BERKAS FISIKNYA tidak. Yang paling
        // penting foto dokumentasi: ia tersimpan di public/posters dan disajikan
        // langsung Nginx, jadi tanpa pembersihan ini foto acara yang sudah dihapus
        // masih bisa dibuka lewat URL-nya. Sisanya persoalan ruang disk — satu
        // acara bisa menyimpan 12 foto berukuran sampai 8 MB.
        //
        // Dipasang di model, bukan di controller, supaya berlaku lewat jalur
        // penghapusan mana pun dan tidak perlu ditulis ulang di tiap peran.
        static::deleting(function (self $event) {
            $event->hapusBerkasFisik();
        });
    }

    /**
     * Hapus berkas milik acara ini dari disk. Dipanggil sesaat sebelum barisnya
     * dihapus, ketika relasinya masih bisa dibaca.
     */
    private function hapusBerkasFisik(): void
    {
        // ── Berkas publik di public/posters ───────────────────────────────────
        $dirPublik = realpath(public_path('posters'));

        $publik = $this->dokumentasi()->pluck('file_path')->all();
        if ($this->poster_event) {
            $publik[] = $this->poster_event;
        }

        foreach ($publik as $relatif) {
            $penuh = realpath(public_path($relatif));
            // Pastikan hasil resolusinya masih di dalam public/posters — mencegah
            // nilai kolom yang aneh menghapus berkas di luar direktori itu.
            if ($dirPublik && $penuh && str_starts_with($penuh, $dirPublik . DIRECTORY_SEPARATOR)) {
                @unlink($penuh);
            }
        }

        // ── Berkas privat di storage/app/private ──────────────────────────────
        // Path disk sudah berakar di app/private, jadi jangan tambah 'private/'.
        $privat = [];

        if ($this->kontrak_file) {
            $privat[] = 'kontrak/' . $this->kontrak_file;
        }

        // Bukti unggahan klien menyimpan path lengkap ("bukti-pembayaran/xxx").
        foreach ($this->buktiPembayaran()->pluck('file_bukti')->all() as $berkas) {
            if (filled($berkas)) {
                $privat[] = $berkas;
            }
        }

        // Bukti transaksi biasanya hanya nama berkas, tetapi baris yang lahir dari
        // verifikasi bukti klien menyalin path lengkapnya — keduanya ditangani.
        foreach ($this->transaksis()->pluck('bukti_file')->all() as $berkas) {
            if (filled($berkas)) {
                $privat[] = str_contains($berkas, '/') ? $berkas : 'bukti-transaksi/' . $berkas;
            }
        }

        foreach (array_unique($privat) as $path) {
            try {
                \Illuminate\Support\Facades\Storage::disk('local')->delete($path);
            } catch (\Throwable $e) {
                \Log::warning("Gagal menghapus berkas acara {$path}: " . $e->getMessage());
            }
        }
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

    /**
     * Kolom yang tampil di papan Pipeline — seluruh siklus hidup event klien.
     * Hanya tiga tahap pertama (PIPELINE_STATUSES) yang boleh digeser manual;
     * Upcoming ke atas ditentukan pembayaran & jadwal, bukan seretan kartu.
     */
    public const PIPELINE_KOLOM = [
        self::STATUS_LEAD, self::STATUS_NEGOTIATION, self::STATUS_DEAL,
        self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN, self::STATUS_DONE,
    ];

    /** Berapa hari event Done masih ditampilkan di papan sebelum menghilang. */
    public const PIPELINE_DONE_HARI = 3;

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

    /**
     * Persetujuan penawaran oleh Pihak Manajemen. Penawaran baru dikirimkan ke
     * klien setelah disetujui — sebelum itu ia hanya menunggu di papan pipeline.
     * NULL berarti belum pernah diajukan.
     */
    public const PENAWARAN_DIAJUKAN  = 'Diajukan';
    public const PENAWARAN_DISETUJUI = 'Disetujui';
    public const PENAWARAN_DITOLAK   = 'Ditolak';

    /** Penawaran sudah boleh dilihat & direspon klien. */
    public function penawaranDisetujui(): bool
    {
        return $this->penawaran_status === self::PENAWARAN_DISETUJUI;
    }

    /** Penawaran yang sedang menunggu keputusan Manajemen. */
    public function scopePenawaranMenunggu($q)
    {
        return $q->where('penawaran_status', self::PENAWARAN_DIAJUKAN);
    }

    public function penawaranDiajukanOleh(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'penawaran_diajukan_oleh', 'id_pegawai');
    }

    public function penawaranDitinjauOleh(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'penawaran_ditinjau_oleh', 'id_pegawai');
    }

    /**
     * Dua jenis rencana di menu Planning Event. Pembedanya cuma satu:
     * ada tidaknya klien sasaran.
     *
     *  - Internal → acara milik LMB sendiri, dijalankan sendiri, tidak lewat
     *    pipeline (finalisasi langsung ke Upcoming).
     *  - Ke klien → konsep yang disiapkan untuk ditawarkan ke klien tertentu.
     *    Wajib lewat pipeline supaya penawaran, deal, dan invoice tidak
     *    terlewat.
     */
    public const PLANNING_INTERNAL = 'internal';
    public const PLANNING_KLIEN    = 'klien';
    public const PLANNING_JENIS    = [self::PLANNING_INTERNAL, self::PLANNING_KLIEN];

    /** Event milik LMB sendiri (berasal dari Planning Event). */
    public function scopeInternal($q) { return $q->where('tipe_event', self::TIPE_INTERNAL); }

    /** Event dari klien (masuk lewat pipeline). */
    public function scopeEksternal($q) { return $q->where('tipe_event', self::TIPE_EKSTERNAL); }

    /** Event yang masih berada di papan pipeline (Lead/Negotiation/Deal). */
    public function scopePipeline($q) { return $q->whereIn('status_event', self::PIPELINE_STATUSES); }

    /**
     * Prospek yang sedang digarap di papan pipeline: event klien di tahap
     * Lead/Negotiation/Deal, ditambah rencana yang sudah menyasar klien
     * tertentu — kartu "rencana" di kolom Lead.
     *
     * Satu definisi dipakai bersama papan, perpindahan tahap, dan penyapu
     * prospek mandek. Sebelumnya predikatnya ditulis ulang di tiap tempat,
     * sehingga rencana bertarget klien tampil di papan tapi tidak pernah
     * ikut disapu — prospeknya bisa mengendap tanpa pengingat.
     */
    public function scopeProspekAktif($q)
    {
        return $q->where(function ($w) {
            $w->where(function ($e) {
                $e->where('tipe_event', self::TIPE_EKSTERNAL)
                  ->whereIn('status_event', self::PIPELINE_STATUSES);
            })->orWhere(function ($p) {
                $p->where('tipe_event', self::TIPE_INTERNAL)
                  ->where('status_event', self::STATUS_PLANNING)
                  ->whereNotNull('id_client');
            });
        });
    }

    /**
     * Event "nyata" yang sudah lolos pipeline — dipakai daftar Event, dashboard,
     * dan Task Divisi. Planning (draft internal) dan pipeline (Lead/Negotiation/Deal)
     * sengaja dikecualikan agar calon event tidak bocor ke halaman operasional.
     */
    public function scopeTerkonfirmasi($q) { return $q->whereIn('status_event', [self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN, self::STATUS_DONE]); }

    /**
     * Acara yang benar-benar sedang berjalan untuk tab "Sedang Berjalan" di
     * menu Event: sudah DP lunas dan berjalan, tapi belum selesai. Deal masih
     * menunggu uang muka (belum berjalan) dan Done sudah selesai (masuk
     * Riwayat) — keduanya sengaja dikecualikan agar tabnya tidak tercampur.
     */
    public function scopeSedangBerjalan($q) { return $q->whereIn('status_event', [self::STATUS_UPCOMING, self::STATUS_PENYELESAIAN]); }

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
                  // Hanya rencana internal. Rencana bertarget klien masih calon —
                  // divisi baru mengerjakannya setelah deal dan jadi Upcoming,
                  // supaya papan tidak penuh pekerjaan yang belum tentu terjadi.
                  $i->where('tipe_event', self::TIPE_INTERNAL)
                    ->where('status_event', self::STATUS_PLANNING)
                    ->whereNull('id_client');
              });
        });
    }

    /**
     * Detail yang wajib terisi sebelum event boleh naik ke Negotiation/Deal.
     * Dikembalikan sebagai daftar label yang MASIH kosong — dipakai pipeline
     * untuk memblokir perpindahan, dan halaman detail untuk menampilkan
     * daftar periksa supaya jelas apa yang harus dilengkapi.
     */
    public const DETAIL_WAJIB = [
        'tgl_mulai_event'  => 'Tanggal acara',
        'jam_mulai'        => 'Jam mulai',
        'jam_selesai'      => 'Jam selesai',
        'area_event'       => 'Area acara',
        'jumlah_pax'       => 'Jumlah pax',
        'deal_harga_event' => 'Deal harga',
    ];

    /**
     * Kolom angka yang tidak cukup sekadar "terisi": rencana selalu dibuat
     * dengan nilai 0, dan blank(0) bernilai false — tanpa pengecualian ini
     * keduanya dianggap lengkap sejak awal, sehingga event bisa naik ke Deal
     * dengan harga Rp 0 dan invoice DP ikut terbit Rp 0.
     */
    private const DETAIL_HARUS_POSITIF = ['jumlah_pax', 'deal_harga_event'];

    /**
     * Acara milik LM sendiri tidak menagih siapa pun, jadi jumlah pax dan deal
     * harga tidak berlaku baginya — yang wajib hanya jadwalnya. Tanpa pembedaan
     * ini, acara internal yang difinalisasi dari Planning selamanya dianggap
     * belum lengkap karena menunggu nilai yang memang tidak akan pernah ada.
     */
    public function kelengkapan(): array
    {
        $wajib = $this->tipe_event === self::TIPE_INTERNAL
            ? array_diff_key(self::DETAIL_WAJIB, array_flip(self::DETAIL_HARUS_POSITIF))
            : self::DETAIL_WAJIB;

        $kurang = [];
        foreach ($wajib as $kolom => $label) {
            $kosong = in_array($kolom, self::DETAIL_HARUS_POSITIF, true)
                ? (float) $this->{$kolom} <= 0
                : blank($this->{$kolom});

            if ($kosong) {
                $kurang[] = $label;
            }
        }

        return $kurang;
    }

    /**
     * Aturan validasi kolom jam: "HH:MM" atau "HH:MM:SS".
     *
     * Kolom jam sebelumnya hanya divalidasi sebagai string sepanjang 8 karakter,
     * padahal nilainya diteruskan ke Carbon::parse() di checkBentrok(). Isian
     * yang bukan jam ("25:00", "besok") membuat parse melempar exception —
     * pengguna dapat halaman 500, bukan pesan validasi.
     *
     * Mengandung "|" sehingga harus dipakai dalam bentuk array, bukan rangkaian
     * aturan berpemisah pipa.
     */
    public const ATURAN_JAM = 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/';

    /** Semua tugas event ini sudah Done (dipakai untuk menutup event). */
    public function tugasTuntas(): bool
    {
        return ! $this->tugas()->where('status_tugas', '!=', 'Done')->exists();
    }

    /** Pembayaran sudah menutup nilai kesepakatan. */
    public function pembayaranLunas(): bool
    {
        return self::lunasKah(
            (float) ($this->deal_harga_event ?? 0),
            (float) $this->transaksis()->sum('nominal'),
        );
    }

    /**
     * Aturan tunggal "sudah lunas atau belum", dipakai model maupun layar
     * ringkasan Finance/Transaksi/Laporan yang sudah menghitung angkanya
     * sendiri.
     *
     * Acara tanpa nilai tagihan dianggap tidak punya sisa yang harus ditagih.
     * Sebelumnya layar-layar itu menuliskan syaratnya ulang dengan tambahan
     * "&& deal > 0", sehingga acara bernilai nol tampil "Belum Lunas" selamanya
     * padahal penjadwal menganggapnya lunas dan menutupnya jadi Done — status
     * di layar bertolak belakang dengan yang dilakukan sistem.
     */
    public static function lunasKah(float $deal, float $dibayar): bool
    {
        return $deal <= 0 || $dibayar >= $deal;
    }

    /** Label siap tampil dari aturan yang sama. */
    public static function labelPembayaran(float $deal, float $dibayar): string
    {
        return self::lunasKah($deal, $dibayar) ? 'Lunas' : 'Belum Lunas';
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
     * Penawaran yang terpampang sedang menunggu revisi.
     *
     * Klien sudah meminta penyesuaian sesudah penawaran ini disetujui, jadi
     * angkanya belum tentu berlaku — yang mengikat nanti adalah dokumen
     * revisinya. Negosiasi yang ditutup tanpa revisi tidak menahan, sebab
     * penawaran semula memang tetap berlaku.
     */
    public function menungguRevisi(): bool
    {
        $terakhir = EventNegosiasi::where('id_event', $this->id_event)
            ->where('status', '!=', EventNegosiasi::DITUTUP)
            ->max('created_at');

        if ($terakhir === null) {
            return false;
        }

        return $this->penawaran_ditinjau_pada === null
            || \Illuminate\Support\Carbon::parse($terakhir)->greaterThan($this->penawaran_ditinjau_pada);
    }

    /**
     * Acaranya sudah dimulai — hari-H sudah tiba atau sudah lewat.
     *
     * Penjagaan yang bersandar pada status_event saja TIDAK cukup: perpindahan
     * Upcoming → Penyelesaian dikerjakan penjadwal auto-Done pukul 02:00 dengan
     * syarat tanggal akhir < (hari ini − 1 hari), sehingga acara yang berakhir
     * kemarin masih berstatus Upcoming sampai 02:00 lusa. Selama jendela itu,
     * penjagaan berbasis status meloloskan pembatalan atas acara yang jasanya
     * sudah dikerjakan — dan pembatalan menghapus tagihan yang belum dibayar.
     */
    public function sudahBerlangsung(): bool
    {
        if (blank($this->tgl_mulai_event)) {
            return false;
        }

        return \Illuminate\Support\Carbon::parse($this->tgl_mulai_event)
            ->startOfDay()->lessThanOrEqualTo(now()->startOfDay());
    }

    /**
     * Catat satu peristiwa pada jejak acara.
     *
     * Jejak sengaja terpisah dari note_event: catatan itu ikut tercetak pada
     * PDF penawaran maupun PDF detail acara yang diunduh klien, sedangkan
     * jejak berisi keterangan internal seperti alasan penolakan Manajemen.
     *
     * Satu peristiwa satu baris, diawali waktunya, tanpa emoji — font PDF
     * tidak memilikinya sehingga hanya tercetak sebagai kotak kosong.
     */
    public function catatJejak(string $teks): void
    {
        $teks  = preg_replace('/^[^\p{L}\p{N}]+/u', '', trim($teks));
        $baris = '[' . now()->translatedFormat('d M Y H:i') . '] ' . $teks;

        $this->update([
            'jejak_event' => $this->jejak_event ? $this->jejak_event . "\n" . $baris : $baris,
        ]);
    }

    /**
     * Jeda wajib (menit) sebelum & sesudah acara di area yang sama, untuk
     * setup dan bongkar. Mencegah dua acara dijadwalkan mepet sehingga
     * mustahil dikerjakan tim di lapangan.
     */
    public const BUFFER_JADWAL_MENIT = 60;

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
    public static function checkBentrok($tgl, $jam_mulai, $jam_selesai, $area, $exclude_id = null, $tgl_selesai = null, $loading_in = null, $loading_out = null): ?self
    {
        // Rentang "sibuk" acara = loading in s/d loading out (mencakup bongkar-pasang).
        // Bila loading tidak diisi, pakai jam acara sebagai gantinya.
        $awalJam  = $loading_in  ?: $jam_mulai;
        $akhirJam = $loading_out ?: $jam_selesai;

        $mulai   = \Illuminate\Support\Carbon::parse($tgl . ' ' . $awalJam);
        $selesai = \Illuminate\Support\Carbon::parse(($tgl_selesai ?: $tgl) . ' ' . $akhirJam);

        // Acara lintas tengah malam (mis. 20:00–02:00) — akhir dianggap besoknya.
        if ($selesai->lessThanOrEqualTo($mulai)) {
            $selesai->addDay();
        }

        $batasAwal  = $mulai->copy()->subMinutes(self::BUFFER_JADWAL_MENIT);
        $batasAkhir = $selesai->copy()->addMinutes(self::BUFFER_JADWAL_MENIT);

        // Rentang acara lain juga memakai loading in/out-nya (fallback jam acara).
        $mulaiSql = "CAST(CONCAT(tgl_mulai_event, ' ', COALESCE(loading_in, jam_mulai)) AS DATETIME)";
        $akhirSql = "CAST(CONCAT(COALESCE(tgl_selesai_event, tgl_mulai_event), ' ', COALESCE(loading_out, jam_selesai)) AS DATETIME)";

        // Acara lintas tengah malam yang disimpan tanpa tanggal selesai (mis.
        // resepsi 20:00–02:00, atau bongkar sampai loading_out 01:00) punya jam
        // akhir lebih kecil daripada jam mulai. Tanpa koreksi ini rentangnya
        // terbaca terbalik, sehingga acara tersebut berhenti memblokir slot mana
        // pun — termasuk slot yang benar-benar ditempatinya. Koreksi yang sama
        // sudah dilakukan pada rentang kandidat di atas; keduanya harus memakai
        // aturan yang sama agar perbandingannya adil.
        $akhirSql = "CASE WHEN {$akhirSql} <= {$mulaiSql} THEN {$akhirSql} + INTERVAL 1 DAY ELSE {$akhirSql} END";

        $query = self::where('area_event', $area)
            ->whereNotIn('status_event', [self::STATUS_DONE, self::STATUS_BATAL])
            ->whereRaw("{$mulaiSql} < ?", [$batasAkhir->toDateTimeString()])
            ->whereRaw("{$akhirSql} > ?", [$batasAwal->toDateTimeString()]);

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
    public function dokumentasi()
    {
        return $this->hasMany(EventDokumentasi::class, 'id_event', 'id_event')
            ->orderBy('urutan')->orderBy('id');
    }

    /** Riwayat pembatalan acara ini (pembatalan berlaku seketika). */
    public function pembatalan()
    {
        return $this->hasMany(EventPembatalan::class, 'id_event', 'id_event')->latest();
    }

    /** Riwayat pengajuan ganti tanggal acara ini. */
    public function reschedule()
    {
        return $this->hasMany(EventReschedule::class, 'id_event', 'id_event')->latest();
    }

    /**
     * Pengajuan ganti tanggal yang masih menunggu keputusan Manajemen, bila ada.
     * Dipakai untuk memblokir pengajuan ganda dan menampilkan statusnya ke klien.
     */
    public function rescheduleMenunggu()
    {
        return $this->hasOne(EventReschedule::class, 'id_event', 'id_event')
            ->where('status', EventReschedule::STATUS_DIAJUKAN)
            ->latestOfMany();
    }
}
