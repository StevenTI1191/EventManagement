<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Buat Data Pegawai
        $pegawai = \App\Models\Pegawai::create([
            'nama_pegawai'    => 'Howandi Chandra',
            'jenis_pegawai'   => 'Internal',
            'posisi_pegawai'  => 'Manajemen',
            'no_hp_pegawai'   => '08123456789',
            'email_pegawai'   => 'howandi@gmail.com',
            'password_pegawai' => Hash::make('password123'),
        ]);

        // Pegawai Event Marketing
        $pegawaiEM = \App\Models\Pegawai::create([
            'nama_pegawai'     => 'Hengky Fernando',
            'jenis_pegawai'    => 'Internal',
            'posisi_pegawai'   => 'EventMarketing',
            'no_hp_pegawai'    => '08234567890',
            'email_pegawai'    => 'hengky@laksamana.id',
            'password_pegawai' => Hash::make('password123'),
            'rekomendasi_rehire' => 'Yes',
        ]);
        // 2. Buat Data Client
        $client = \App\Models\Client::create([
            'nama_client'       => 'Hengky Kurniawan',
            'perusahaan_client' => 'Mitsubishi Pekanbaru',
            'no_telp_client'    => '08112233445',
            'email_client'      => 'hengky@mitsubishi.id',
        ]);

        // 3. Buat Data Event
        $event = \App\Models\Event::create([
            'id_client'        => $client->id,
            'id_pegawai'       => $pegawai->id_pegawai,
            'nama_event'       => 'Music Festival Laksamana Muda 2026',
            'tgl_mulai_event'  => '2026-06-20',
            'tgl_selesai_event' => '2026-06-21',
            'status_event'     => 'Upcoming',
            'deal_harga_event' => 15000000,
            'jumlah_pax'       => 500,
            'area_event'       => 'Outdoor',
        ]);

        // 4. Buat Data Transaksi (cicilan pembayaran client)
        \App\Models\Transaksi::create([
            'id_event'   => $event->id_event,
            'id_pegawai' => $pegawai->id_pegawai,
            'nominal'    => 5000000,
            'tgl_bayar'  => '2026-05-01',
            'keterangan' => 'DP 50%',
        ]);

        // 5. Buat Data Transaksi Item (rincian pengeluaran/pemasukan)
        \App\Models\TransaksiItem::create([
            'id_event'  => $event->id_event,
            'tipe'      => 'Pengeluaran',
            'nama_item' => 'Sewa Venue Outdoor',
            'qty'       => 1,
            'harga'     => 3000000,
            'total'     => 3000000,
        ]);

        \App\Models\TransaksiItem::create([
            'id_event'  => $event->id_event,
            'tipe'      => 'Pengeluaran',
            'nama_item' => 'Band Pengisi',
            'qty'       => 1,
            'harga'     => 2000000,
            'total'     => 2000000,
        ]);
    }
}
