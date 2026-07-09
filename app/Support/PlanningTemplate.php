<?php

namespace App\Support;

/**
 * Template To-Do persiapan event Laksamana Muda.
 * Dipakai untuk auto-generate tugas saat event dibuat lewat menu Planning Event.
 * Saat menambah event, user memilih kategori mana yang ikut di-generate.
 * Tiap item: [nama, timeline?]. Timeline berupa teks (H-60 dst), bisa diubah manual di board.
 */
class PlanningTemplate
{
    /**
     * @return array<string, array<int, array{0:string,1:?string}>>
     */
    public static function items(): array
    {
        return [
            'Talent' => [
                ['Pemilihan Talent', 'H-60'],
                ['Negosiasi Fee & Kontrak', 'H-45'],
                ['Transportasi', 'H-45'],
                ['Band Pengiring', 'H-30'],
                ['Kebutuhan Teknis', 'H-14'],
                ['Hotel & Transportasi Hari H', 'H-14'],
                ['Kebutuhan Rider & Konsumsi', 'H-1'],
            ],
            'Legalitas' => [
                ['Surat Izin Keramaian', 'H-30'],
                ['Keamanan', 'H-7'],
            ],
            'Marketing' => [
                ['Proposal Sponsorship', 'H-45'],
                ['Approach Sponsor', 'H-45'],
            ],
            'Sosial Media & Designer' => [
                ['Design Flyer Promosi', 'H-45'],
                ['Design Feeds', 'H-30'],
                ['Design Videotron', 'H-30'],
                ['Design Spanduk Depan', 'H-30'],
                ['Design Tiket Gelang', 'H-15'],
                ['Design E-tiket', 'H-40'],
                ['Cetakan Menu Khusus Event', 'H-3'],
                ['Cetak Tiket Gelang', 'H-7'],
                ['Branding & Konsep Campaign', 'H-45'],
                ['Publikasi Sosmed', 'H-30 s/d H'],
                ['Ads Digital', 'H-30 s/d H'],
                ['Media Partner & KOL', 'H-30'],
            ],
            'Strategi Penjualan / Promo' => [
                ['Giveaway', null],
            ],
            'Ticketing & Registration' => [
                ['Google Form Ticketing', 'H-45'],
                ['Integrasi Seatmap ke Sistem', 'H-40'],
                ['Uji Coba Sistem Tiket', 'H-35'],
                ['Publikasi Link Tiket / QR Code', 'H-30'],
                ['Monitoring Penjualan', 'H-30 s/d H'],
                ['Check in & Scanning Tiket', 'H (Hari - H)'],
            ],
            'F&B' => [
                ['Menu Khusus Makanan', 'H-40'],
                ['Menu Khusus Minuman', 'H-40'],
                ['Stock & Purchase Order', 'H-14'],
                ['Persiapan bahan-bahan', 'H-7'],
            ],
            'Finance' => [
                ['RAB Awal', 'H-60'],
                ['Update Realisasi Harian', 'H-30 s/d H'],
                ['Pembayaran DP Talent', 'H-30'],
                ['Pelunasan Talent', 'H-1'],
                ['Pembayaran DP Band Pengiring', 'H-30'],
                ['Pelunasan Band Pengiring', 'H-1'],
            ],
            'Acara' => [
                ['Draft Rundown', 'H-30'],
                ['Final Rundown', 'H-7'],
                ['Brief MC / Talent', 'H-1'],
            ],
            'Operasional - Floor' => [
                ['Draft Layout Meja (untuk seatmap)', 'H-60 s/d H-45'],
                ['Final Layout Meja', 'H-30'],
                ['Cek Kebutuhan Extra Meja & Kursi', null],
                ['Seatmap Publikasi', 'H-30'],
                ['Cek Kebutuhan Extra Freelance', 'H-5'],
                ['Training & Pengenalan Layout', 'H-3'],
                ['Setting kebutuhan lainnya', 'H-3'],
                ['Sign Petunjuk Arah / Aturan', 'H-3'],
                ['Set up Meja Fisik', 'H-1'],
            ],
            'Operasional - Kasir' => [
                ['Sistem Kasir untuk menu paket event', 'H-5'],
                ['Menu Paket Event', 'H-5'],
                ['Training & Pengenalan menu event', 'H-3'],
                ['List kasir yang bertugas', 'H-3'],
            ],
            'Operasional - Lainnya' => [],
        ];
    }

    /**
     * Urutan kanonik kategori (untuk pengelompokan tampilan board & pilihan saat buat event).
     * @return array<int, string>
     */
    public static function categories(): array
    {
        return array_keys(self::items());
    }
}
