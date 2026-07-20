<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\BuktiPembayaran;
use App\Models\Client;
use App\Models\ClientFollowUp;
use App\Models\Event;
use App\Models\Invoice;
use App\Models\Pegawai;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use App\Support\TugasTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Data awal yang mencerminkan sistem sekarang.
 *
 * Seeder sebelumnya dibuat sebelum ada pipeline, invoice, appointment, dan
 * penanda asal acara — hasilnya satu acara Upcoming saja, sehingga halaman
 * Pipeline, Riwayat, dan Semua Event tampil kosong setelah seeding.
 *
 * Di sini tiap tahap siklus diisi satu contoh supaya seluruh alur bisa
 * ditelusuri dan diperagakan tanpa perlu memasukkan data manual dulu.
 */
class DatabaseSeeder extends Seeder
{
    /** Kata sandi seragam untuk semua akun contoh. */
    private const SANDI = 'password123';

    public function run(): void
    {
        [$manajemen, $em, $finance] = $this->pegawai();
        [$mitsubishi, $alphaFit, $gunawan] = $this->klien();

        $this->acaraSelesai($em, $mitsubishi, $finance);
        $this->acaraBerjalan($em, $gunawan, $finance);
        $this->acaraDeal($em, $mitsubishi, $finance);
        $this->acaraNegotiation($em, $gunawan);
        $this->acaraLead($em, $alphaFit);
        $this->rencanaInternal($manajemen);
        $this->rencanaKeKlien($em, $alphaFit);
    }

    /** Ketiga peran dibuat sekaligus — sistem tidak bisa diuji tanpa salah satunya. */
    private function pegawai(): array
    {
        return [
            Pegawai::create([
                'nama_pegawai'     => 'Howandi Chandra',
                'jenis_pegawai'    => 'Internal',
                'posisi_pegawai'   => 'Manajemen',
                'no_hp_pegawai'    => '08123456789',
                'email_pegawai'    => 'howandi@gmail.com',
                'password_pegawai' => Hash::make(self::SANDI),
            ]),
            Pegawai::create([
                'nama_pegawai'       => 'Hengky Fernando',
                'jenis_pegawai'      => 'Internal',
                'posisi_pegawai'     => 'EventMarketing',
                'no_hp_pegawai'      => '08234567890',
                'email_pegawai'      => 'hengky@laksamana.id',
                'password_pegawai'   => Hash::make(self::SANDI),
                'rekomendasi_rehire' => 'Yes',
            ]),
            Pegawai::create([
                'nama_pegawai'     => 'Cindy Juliawati',
                'jenis_pegawai'    => 'Internal',
                'posisi_pegawai'   => 'Finance',
                'no_hp_pegawai'    => '08345678901',
                'email_pegawai'    => 'cindy@laksamana.id',
                'password_pegawai' => Hash::make(self::SANDI),
            ]),
        ];
    }

    /**
     * Klien dicatat sebagai prospek hasil input tim, tanpa kata sandi portal.
     *
     * Akun portal tidak dibuatkan di sini: klien nyata mendaftar sendiri lewat
     * halaman registrasi, dan membuatkan akun beserta sandinya berarti
     * mengarang pendaftaran yang tidak pernah terjadi. Data ini hanya menjadi
     * pihak yang dituju oleh acara, persis seperti prospek yang di-input tim
     * Event Marketing sehari-hari.
     */
    private function klien(): array
    {
        return collect([
            ['Hengky Kurniawan', 'Mitsubishi Pekanbaru', '08112233445', 'hengky@mitsubishi.id'],
            ['Rio Pratama',      'Alpha Fit Gym',        '08221144556', 'rio@alphafit.id'],
            ['Gunawan Saputra',  'Bank Riau Kepri',      '08331155667', 'gunawan@bankriau.id'],
        ])->map(fn ($c) => Client::create([
            'nama_client'       => $c[0],
            'perusahaan_client' => $c[1],
            'no_telp_client'    => $c[2],
            'email_client'      => $c[3],
            'sumber'            => Client::SUMBER_INTERNAL,
        ]))->all();
    }

    /** Nilai bawaan acara klien — dipakai ulang agar tiap tahap konsisten. */
    private function acaraKlien(array $isi): Event
    {
        return Event::create($isi + [
            'tipe_event'    => Event::TIPE_EKSTERNAL,
            'dari_planning' => false,
            'is_public'     => false,
        ]);
    }

    /** Acara yang sudah tuntas — mengisi halaman Riwayat. */
    private function acaraSelesai(Pegawai $em, Client $klien, Pegawai $finance): void
    {
        $event = $this->acaraKlien([
            'id_client'        => $klien->id,
            'id_pegawai'       => $em->id_pegawai,
            'nama_event'       => 'Grand Launching Mitsubishi Xforce',
            'kategori_event'   => 'Corporate',
            'deskripsi_event'  => 'Peluncuran produk baru dengan sesi test drive.',
            'tgl_mulai_event'  => now()->subMonths(2)->toDateString(),
            'jam_mulai'        => '18:00',
            'jam_selesai'      => '22:00',
            'area_event'       => 'Ballroom Hotel Pangeran',
            'status_event'     => Event::STATUS_DONE,
            'respon_klien'     => 'Diterima',
            'tgl_respon_klien' => now()->subMonths(3),
            'jumlah_pax'       => 300,
            'harga_per_pax'    => 150000,
            'deal_harga_event' => 45000000,
            'is_public'        => true,
        ]);

        TugasTemplate::generate($event);
        $event->tugas()->update(['status_tugas' => 'Done', 'progress' => 100]);

        // Lunas: DP + pelunasan, keduanya terverifikasi.
        foreach ([['DP', 22500000, 3], ['Pelunasan', 22500000, 2]] as [$tipe, $nominal, $bulan]) {
            $invoice = Invoice::create([
                'id_event'        => $event->id_event,
                'id_pegawai'      => $finance->id_pegawai,
                'nomor_invoice'   => Invoice::generateNomor(),
                'tipe'            => $tipe,
                'nominal'         => $nominal,
                'tgl_terbit'      => now()->subMonths($bulan)->toDateString(),
                'tgl_jatuh_tempo' => now()->subMonths($bulan)->addDays(7)->toDateString(),
                'status'          => Invoice::STATUS_LUNAS,
            ]);

            Transaksi::create([
                'id_event'   => $event->id_event,
                'id_pegawai' => $finance->id_pegawai,
                'nominal'    => $nominal,
                'tgl_bayar'  => now()->subMonths($bulan)->addDays(3)->toDateString(),
                'keterangan' => $tipe . ' ' . $invoice->nomor_invoice,
            ]);
        }

        foreach ([['Sewa Ballroom', 12000000], ['Sound System & Lighting', 8000000], ['Konsumsi 300 pax', 9000000]] as [$nama, $harga]) {
            TransaksiItem::create([
                'id_event'  => $event->id_event,
                'tipe'      => 'Pengeluaran',
                'nama_item' => $nama,
                'qty'       => 1,
                'harga'     => $harga,
                'total'     => $harga,
            ]);
        }
    }

    /** Acara yang sedang dipersiapkan — mengisi menu Event & To-Do-List. */
    private function acaraBerjalan(Pegawai $em, Client $klien, Pegawai $finance): void
    {
        $event = $this->acaraKlien([
            'id_client'         => $klien->id,
            'id_pegawai'        => $em->id_pegawai,
            'nama_event'        => 'Gathering Akhir Tahun Bank Riau Kepri',
            'kategori_event'    => 'Corporate',
            'deskripsi_event'   => 'Ramah tamah karyawan beserta penghargaan tahunan.',
            'tgl_mulai_event'   => now()->addMonth()->toDateString(),
            'jam_mulai'         => '19:00',
            'jam_selesai'       => '23:00',
            'area_event'        => 'Grand Ballroom Labersa',
            'technical_meeting' => now()->addMonth()->subDays(3)->format('Y-m-d') . 'T14:00',
            'gladi_resik'       => now()->addMonth()->subDay()->format('Y-m-d') . 'T15:00',
            'status_event'      => Event::STATUS_UPCOMING,
            'respon_klien'      => 'Diterima',
            'tgl_respon_klien'  => now()->subWeeks(3),
            'jumlah_pax'        => 250,
            'harga_per_pax'     => 160000,
            'deal_harga_event'  => 40000000,
            'is_public'         => true,
        ]);

        TugasTemplate::generate($event);
        // Sebagian sudah dikerjakan supaya progresnya tidak nol.
        $event->tugas()->limit(12)->update(['status_tugas' => 'Done', 'progress' => 100]);

        $dp = Invoice::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => $finance->id_pegawai,
            'nomor_invoice'   => Invoice::generateNomor(),
            'tipe'            => Invoice::TIPE_DP,
            'nominal'         => 20000000,
            'tgl_terbit'      => now()->subWeeks(3)->toDateString(),
            'tgl_jatuh_tempo' => now()->subWeeks(2)->toDateString(),
            'status'          => Invoice::STATUS_LUNAS,
        ]);

        Transaksi::create([
            'id_event'   => $event->id_event,
            'id_pegawai' => $finance->id_pegawai,
            'nominal'    => 20000000,
            'tgl_bayar'  => now()->subWeeks(2)->toDateString(),
            'keterangan' => 'DP ' . $dp->nomor_invoice,
        ]);

        BuktiPembayaran::create([
            'id_event'   => $event->id_event,
            'id_invoice' => $dp->id_invoice,
            'client_id'  => $klien->id,
            'file_bukti' => 'bukti-pembayaran/contoh-transfer.jpg',
            'nominal'    => 20000000,
            'keterangan' => 'Transfer uang muka via BRI',
            'status'     => 'Diverifikasi',
            'ocr_status' => 'Cocok',
        ]);

        // Pelunasan sudah terbit tapi belum dibayar — mengisi halaman Invoice.
        Invoice::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => $finance->id_pegawai,
            'nomor_invoice'   => Invoice::generateNomor(),
            'tipe'            => Invoice::TIPE_PELUNASAN,
            'nominal'         => 20000000,
            'tgl_terbit'      => now()->subWeek()->toDateString(),
            'tgl_jatuh_tempo' => now()->addWeeks(2)->toDateString(),
            'status'          => Invoice::STATUS_BELUM,
        ]);

        Appointment::create([
            'client_id'       => $klien->id,
            'id_pegawai'      => $em->id_pegawai,
            'id_event'        => $event->id_event,
            'jenis_event'     => 'Corporate Gathering',
            'deskripsi_event' => 'Perencanaan gathering akhir tahun.',
            'jumlah_tamu'     => 250,
            'estimasi_budget' => 40000000,
            'tgl_request'     => now()->subMonth()->toDateString(),
            'jam_request'     => '10:00',
            'tgl_konfirmasi'  => now()->subMonth()->toDateString(),
            'jam_konfirmasi'  => '10:00',
            'status'          => 'Selesai',
            'catatan_meeting' => 'Klien minta panggung utama, 2 MC, dan sesi door prize.',
        ]);
    }

    /** Sudah disepakati, menunggu uang muka — mengisi kolom Deal di pipeline. */
    private function acaraDeal(Pegawai $em, Client $klien, Pegawai $finance): void
    {
        $event = $this->acaraKlien([
            'id_client'        => $klien->id,
            'id_pegawai'       => $em->id_pegawai,
            'nama_event'       => 'Buka Puasa Bersama Mitsubishi',
            'kategori_event'   => 'Corporate',
            'tgl_mulai_event'  => now()->addMonths(3)->toDateString(),
            'jam_mulai'        => '17:00',
            'jam_selesai'      => '21:00',
            'area_event'       => 'Aula Mitsubishi Pekanbaru',
            'status_event'     => Event::STATUS_DEAL,
            'respon_klien'     => 'Diterima',
            'tgl_respon_klien' => now()->subDays(4),
            'jumlah_pax'       => 180,
            'harga_per_pax'    => 125000,
            'deal_harga_event' => 22500000,
        ]);

        Invoice::create([
            'id_event'        => $event->id_event,
            'id_pegawai'      => $finance->id_pegawai,
            'nomor_invoice'   => Invoice::generateNomor(),
            'tipe'            => Invoice::TIPE_DP,
            'nominal'         => 11250000,
            'tgl_terbit'      => now()->subDays(3)->toDateString(),
            'tgl_jatuh_tempo' => now()->addDays(4)->toDateString(),
            'status'          => Invoice::STATUS_BELUM,
        ]);
    }

    /** Penawaran sudah dikirim, menunggu jawaban klien. */
    private function acaraNegotiation(Pegawai $em, Client $klien): void
    {
        $event = $this->acaraKlien([
            'id_client'        => $klien->id,
            'id_pegawai'       => $em->id_pegawai,
            'nama_event'       => 'Seminar Literasi Keuangan Daerah',
            'kategori_event'   => 'Seminar',
            'deskripsi_event'  => 'Seminar setengah hari untuk nasabah prioritas.',
            'tgl_mulai_event'  => now()->addMonths(2)->addDays(10)->toDateString(),
            'jam_mulai'        => '08:00',
            'jam_selesai'      => '12:00',
            'area_event'       => 'Auditorium Bank Riau Kepri',
            'status_event'     => Event::STATUS_NEGOTIATION,
            'jumlah_pax'       => 120,
            'harga_per_pax'    => 100000,
            'deal_harga_event' => 12000000,
        ]);

        ClientFollowUp::create([
            'id_client'      => $klien->id,
            'id_pegawai'     => $em->id_pegawai,
            'id_event'       => $event->id_event,
            'catatan'        => 'Penawaran sudah dikirim lewat WhatsApp. Klien minta waktu rapat internal.',
            'tgl_berikutnya' => now()->addDays(5)->toDateString(),
        ]);
    }

    /** Prospek baru yang detailnya belum lengkap — kolom Lead. */
    private function acaraLead(Pegawai $em, Client $klien): void
    {
        $event = $this->acaraKlien([
            'id_client'        => $klien->id,
            'id_pegawai'       => $em->id_pegawai,
            'nama_event'       => 'Fun Run Alpha Fit Gym',
            'kategori_event'   => 'Lainnya',
            'deskripsi_event'  => 'Lari santai 5K untuk member gym dan umum.',
            'tgl_mulai_event'  => now()->addMonths(4)->toDateString(),
            'status_event'     => Event::STATUS_LEAD,
            'jumlah_pax'       => 0,
            'deal_harga_event' => 0,
        ]);

        Appointment::create([
            'client_id'       => $klien->id,
            'id_pegawai'      => $em->id_pegawai,
            'id_event'        => $event->id_event,
            'jenis_event'     => 'Sports Event',
            'deskripsi_event' => 'Diskusi awal konsep fun run.',
            'jumlah_tamu'     => 400,
            'estimasi_budget' => 30000000,
            'tgl_request'     => now()->addDays(3)->toDateString(),
            'jam_request'     => '13:00',
            'tgl_konfirmasi'  => now()->addDays(3)->toDateString(),
            'jam_konfirmasi'  => '13:30',
            'status'          => 'Dikonfirmasi',
        ]);
    }

    /** Acara milik LM sendiri — tidak lewat pipeline, hanya di To-Do-List. */
    private function rencanaInternal(Pegawai $manajemen): void
    {
        $event = Event::create([
            'id_pegawai'      => $manajemen->id_pegawai,
            'nama_event'      => 'Anniversary Laksamana Muda ke-6',
            'kategori_event'  => 'Corporate',
            'deskripsi_event' => 'Perayaan ulang tahun perusahaan bersama seluruh tim.',
            'tgl_mulai_event' => now()->addMonths(5)->toDateString(),
            'status_event'    => Event::STATUS_PLANNING,
            'tipe_event'      => Event::TIPE_INTERNAL,
            'dari_planning'   => true,
            'is_public'       => false,
            'jumlah_pax'      => 0,
            'deal_harga_event' => 0,
            'target_pax'      => 120,
            'target_omset'    => 0,
        ]);

        TugasTemplate::generate($event, ['Acara', 'F&B', 'Marketing']);
    }

    /** Konsep yang disiapkan untuk ditawarkan ke klien — kartu rencana di Lead. */
    private function rencanaKeKlien(Pegawai $em, Client $klien): void
    {
        $event = Event::create([
            'id_client'       => $klien->id,
            'id_pegawai'      => $em->id_pegawai,
            'nama_event'      => 'Kontes Body Building Alpha Fit',
            'kategori_event'  => 'Lainnya',
            'deskripsi_event' => 'Konsep kontes binaraga tingkat provinsi untuk ditawarkan ke Alpha Fit Gym.',
            'tgl_mulai_event' => now()->addMonths(6)->toDateString(),
            'status_event'    => Event::STATUS_PLANNING,
            'tipe_event'      => Event::TIPE_INTERNAL,
            'dari_planning'   => true,
            'is_public'       => false,
            'jumlah_pax'      => 0,
            'deal_harga_event' => 0,
            'target_pax'      => 500,
            'target_omset'    => 60000000,
        ]);

        TugasTemplate::generate($event, ['Talent', 'Marketing', 'Ticketing & Registration']);
    }
}
