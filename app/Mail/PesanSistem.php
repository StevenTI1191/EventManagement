<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Surel serbaguna bertampilan sama dengan surel lain di sistem.
 *
 * Sebelumnya seluruh pemberitahuan non-transaksional dikirim memakai Mail::raw()
 * — teks polos tanpa kepala, tanpa rincian yang tertata, dan tidak terbaca rapi
 * di ponsel. Padahal isinya justru yang paling sering dibuka: pengingat tagihan,
 * teguran prospek, permintaan persetujuan, dan kabar jadwal.
 *
 * Kelas ini menerima isi yang sudah terstruktur lalu menyerahkan perenderannya
 * ke kerangka bersama, sehingga tiap pemanggil tidak perlu menulis HTML sendiri
 * dan tampilannya dijamin seragam.
 */
class PesanSistem extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string>              $paragraf  kalimat isi
     * @param  array<string,string>       $detail    label => nilai
     * @param  array{label:string,url:string}|null $tombol
     */
    public function __construct(
        public string $judul,
        public array $paragraf = [],
        public array $detail = [],
        public ?string $subjudul = null,
        public ?string $ikon = null,
        public string $nada = 'emas',
        public ?string $sapaan = null,
        public ?string $sorotan = null,
        public ?string $catatan = null,
        public ?array $tombol = null,
        public ?string $penutup = null,
        public ?string $subjek = null,
    ) {
    }

    public function envelope(): Envelope
    {
        // Baris subjek boleh berbeda dari judul di dalam surel: judul boleh
        // panjang dan deskriptif, subjek harus ringkas agar tak terpotong.
        return new Envelope(
            subject: ($this->subjek ?: $this->judul) . ' — ' . config('perusahaan.nama'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.kerangka',
            with: [
                'judul'    => $this->judul,
                'subjudul' => $this->subjudul,
                'ikon'     => $this->ikon,
                'nada'     => $this->nada,
                'sapaan'   => $this->sapaan,
                'paragraf' => $this->paragraf,
                'detail'   => $this->detail,
                'sorotan'  => $this->sorotan,
                'catatan'  => $this->catatan,
                'tombol'   => $this->tombol,
                'penutup'  => $this->penutup,
            ],
        );
    }
}
