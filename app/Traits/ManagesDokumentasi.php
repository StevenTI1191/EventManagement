<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\EventDokumentasi;
use App\Support\UnggahGambar;
use Illuminate\Http\Request;

/**
 * Unggah & hapus foto dokumentasi acara. Dipakai bersama Event Marketing dan
 * Manajemen. Dokumentasi hanya boleh diunggah untuk acara yang sudah masuk
 * tahap Penyelesaian atau Done — foto inilah yang tampil sebagai galeri di
 * portfolio publik.
 *
 * Berkas disimpan di public/posters (volume yang sudah ada & disajikan Nginx),
 * jadi tidak perlu menambah volume Docker baru di server.
 */
trait ManagesDokumentasi
{
    /** Tegakkan peran yang boleh mengelola dokumentasi. */
    abstract protected function checkDokumentasiAkses(): void;

    public function uploadDokumentasi(Request $request, $id_event)
    {
        $this->checkDokumentasiAkses();

        $event = Event::findOrFail($id_event);

        if (! in_array($event->status_event, [Event::STATUS_PENYELESAIAN, Event::STATUS_DONE], true)) {
            return back()->with('error', 'Dokumentasi hanya bisa diunggah untuk acara yang sudah masuk tahap Penyelesaian atau Selesai.');
        }

        $request->validate([
            'foto'   => 'required|array|max:12',
            // Aturannya satu untuk seluruh sistem — lihat UnggahGambar. Dulu
            // memakai `image` tanpa pesan galat, sehingga penolakannya berbunyi
            // lain daripada halaman unggahan gambar yang lain.
            // Sengaja tidak wajib per elemen: kehadiran berkasnya sudah dijaga
            // oleh aturan `required|array` di atas, sedangkan slot kosong pada
            // masukan berkas memang dilewati saat penyimpanan.
            'foto.*' => UnggahGambar::aturan(maksKb: 8192),
        ], UnggahGambar::pesan('foto.*', 'foto dokumentasi', 8192));

        $dir = public_path('posters');
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $mulai = (int) EventDokumentasi::where('id_event', $event->id_event)->max('urutan');
        $n     = 0;

        foreach (array_values($request->file('foto')) as $i => $file) {
            if (! $file->isValid()) {
                continue;
            }
            // Nama berkas WAJIB dari hashName(): ekstensinya diturunkan dari MIME
            // hasil pembacaan isi berkas, bukan dari nama kiriman pengguna.
            // Memakai getClientOriginalExtension() membuat berkas bisa mendarat
            // di public/ dengan ekstensi apa pun — termasuk .php, yang dieksekusi
            // Nginx (location ~ \.php$ tidak dibatasi direktori). Aturan "image"
            // hanya memeriksa ISI, jadi gambar yang di dalamnya diselipkan kode
            // dan dinamai .php akan lolos. Sejalan dengan unggahan poster & bukti
            // pembayaran yang sudah memakai hashName().
            $filename = 'dok_' . $event->id_event . '_' . $file->hashName();
            $file->move($dir, $filename);

            EventDokumentasi::create([
                'id_event'  => $event->id_event,
                'file_path' => 'posters/' . $filename,
                'urutan'    => $mulai + $i + 1,
            ]);
            $n++;
        }

        return back()->with('success', $n . ' foto dokumentasi berhasil diunggah.');
    }

    public function destroyDokumentasi($id)
    {
        $this->checkDokumentasiAkses();

        $dok = EventDokumentasi::findOrFail($id);

        // Hapus berkas fisik dengan guard path traversal — hanya di dalam public/posters.
        $safeDir = realpath(public_path('posters'));
        $full    = realpath(public_path($dok->file_path));
        if ($safeDir && $full && str_starts_with($full, $safeDir . DIRECTORY_SEPARATOR)) {
            @unlink($full);
        }

        $dok->delete();

        return back()->with('success', 'Foto dokumentasi dihapus.');
    }
}
