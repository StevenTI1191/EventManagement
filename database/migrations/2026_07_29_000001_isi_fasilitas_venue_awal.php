<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Isi awal daftar fasilitas venue, mengikuti bagian "GRATIS FASILITAS VENUE"
 * pada surat penawaran resmi.
 *
 * Ditulis sebagai migrasi, bukan seeder, karena alur deploy hanya menjalankan
 * `migrate --force` — seeder harus dipanggil manual dan mudah terlewat,
 * sehingga bagian fasilitas pada halaman depan klien akan tetap kosong di
 * server meski kodenya sudah terpasang.
 *
 * Bersifat sekali jalan: bila tabelnya sudah berisi, isinya tidak disentuh
 * sama sekali agar perubahan yang dilakukan Tim Event Marketing tidak tertimpa.
 * Foto sengaja dikosongkan — halaman depan menampilkan penanda sampai tim
 * mengunggah fotonya sendiri lewat menu Fasilitas Venue.
 */
return new class extends Migration
{
    /** Sesuai urutan yang tercantum pada surat penawaran. */
    private const FASILITAS = [
        ['Videotron', 'Layar LED besar, mega HD',
         'Layar utama untuk menayangkan materi acara, logo sponsor, maupun siaran langsung panggung.'],

        ['Area Indoor Full AC', 'Sepenuhnya ber-AC',
         'Penggunaan area indoor yang sejuk, sehingga acara tetap nyaman tanpa bergantung pada cuaca.'],

        ['Panggung Utama', '4,2 × 7,6 meter',
         'Panggung siap pakai untuk sambutan, hiburan, maupun penampilan band.'],

        ['Sound System & Lighting', 'Setara standar konser',
         'Perangkat suara dan tata cahaya kelas konser, tidak perlu disewa terpisah.'],

        ['Kursi & Meja Tamu', null,
         'Perlengkapan duduk tamu beserta penataannya mengikuti denah acara.'],

        ['Tim Teknis & Operator', 'Bertugas di lokasi',
         'Operator videotron, suara, dan pencahayaan yang mendampingi sepanjang acara berlangsung.'],

        ['Tim Keamanan & Kebersihan', null,
         'Menjaga ketertiban dan kebersihan area selama acara berlangsung.'],

        ['Tim Pelayanan Tamu', 'Host & waiters',
         'Penyambutan tamu serta pelayanan selama acara berjalan.'],

        ['VIP Room', 'Dapat dialihfungsikan',
         'Ruang VIP dapat dialihfungsikan menjadi area khusus sesuai kebutuhan acara.'],
    ];

    public function up(): void
    {
        // Sudah ada isinya berarti tim sudah mengelolanya sendiri — jangan ganggu.
        if (DB::table('venue_fasilitas')->exists()) {
            return;
        }

        $sekarang = now();

        DB::table('venue_fasilitas')->insert(
            collect(self::FASILITAS)->map(fn (array $f, int $i) => [
                'nama'        => $f[0],
                'spesifikasi' => $f[1],
                'keterangan'  => $f[2],
                'foto'        => null,
                'urutan'      => $i + 1,
                'aktif'       => true,
                'created_at'  => $sekarang,
                'updated_at'  => $sekarang,
            ])->all()
        );
    }

    public function down(): void
    {
        // Hanya menarik kembali baris bawaan ini; fasilitas yang ditambahkan
        // tim sesudahnya dibiarkan utuh.
        DB::table('venue_fasilitas')
            ->whereIn('nama', array_column(self::FASILITAS, 0))
            ->delete();
    }
};
