<?php

namespace App\Support;

/**
 * Template To-Do persiapan event Laksamana Muda.
 * Dipakai untuk auto-generate tugas saat event dibuat lewat menu Planning Event.
 * Saat menambah event, user memilih kategori mana yang ikut di-generate.
 * Tiap item: [nama, timeline?]. Timeline opsional (bisa diisi manual di board).
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
                ['Pemilihan Talent', null],
                ['Negosiasi Fee & Kontrak', null],
                ['Transportasi', null],
                ['Band Pengiring', null],
                ['Kebutuhan Teknis', null],
                ['Hotel & Transportasi Hari H', null],
                ['Kebutuhan Rider & Konsumsi', null],
            ],
            'Legalitas' => [
                ['Surat Izin Keramaian', null],
                ['Keamanan', null],
            ],
            'Marketing' => [
                ['Proposal Sponsorship', null],
                ['Approach Sponsor', null],
            ],
            'Sosial Media & Designer' => [
                ['Design Flyer Promosi', null],
                ['Design Feeds', null],
                ['Design Videotron', null],
                ['Design Spanduk Depan', null],
                ['Design Tiket Gelang', null],
                ['Design E-tiket', null],
                ['Cetakan Menu Khusus Event', null],
                ['Cetak Tiket Gelang', null],
                ['Branding & Konsep Campaign', null],
                ['Publikasi Sosmed', null],
                ['Ads Digital', null],
                ['Media Partner & KOL', null],
            ],
            'Strategi Penjualan / Promo' => [
                ['Giveaway', null],
            ],
            'Ticketing & Registration' => [
                ['Google Form Ticketing', null],
                ['Integrasi Seatmap ke Sistem', null],
                ['Uji Coba Sistem Tiket', null],
                ['Publikasi Link Tiket / QR Code', null],
                ['Monitoring Penjualan', null],
                ['Check in & Scanning Tiket', null],
            ],
            'F&B' => [
                ['Menu Khusus Makanan', null],
                ['Menu Khusus Minuman', null],
                ['Stock & Purchase Order', null],
                ['Persiapan bahan-bahan', null],
            ],
            'Finance' => [
                ['RAB Awal', null],
                ['Update Realisasi Harian', null],
                ['Pembayaran DP Talent', null],
                ['Pelunasan Talent', null],
                ['Pembayaran DP Band Pengiring', null],
                ['Pelunasan Band Pengiring', null],
            ],
            'Acara' => [
                ['Draft Rundown', null],
                ['Final Rundown', null],
                ['Brief MC / Talent', null],
            ],
            'Operasional - Floor' => [
                ['Draft Layout Meja (untuk seatmap)', null],
                ['Final Layout Meja', null],
                ['Cek Kebutuhan Extra Meja & Kursi', null],
                ['Seatmap Publikasi', null],
                ['Cek Kebutuhan Extra Freelance', null],
                ['Training & Pengenalan Layout', null],
                ['Setting kebutuhan lainnya', null],
                ['Sign Petunjuk Arah / Aturan', null],
                ['Set up Meja Fisik', null],
            ],
            'Operasional - Kasir' => [
                ['Sistem Kasir untuk menu paket event', null],
                ['Menu Paket Event', null],
                ['Training & Pengenalan menu event', null],
                ['List kasir yang bertugas', null],
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
