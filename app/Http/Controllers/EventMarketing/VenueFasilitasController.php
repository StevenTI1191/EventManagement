<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\VenueFasilitas;
use App\Support\UnggahGambar;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Pengelolaan fasilitas venue yang tampil di halaman depan klien.
 *
 * Dipegang Event Marketing karena merekalah yang menyusun penawaran dan paling
 * tahu fasilitas apa yang sedang dijual beserta spesifikasinya.
 */
class VenueFasilitasController extends Controller
{
    use ChecksPegawaiRole;

    // Batas & format fotonya mengikuti App\Support\UnggahGambar — aturan yang
    // dulu hanya ada di sini kini dipakai seluruh titik unggah gambar.

    public function index()
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/VenueFasilitas/Index', [
            'fasilitas' => VenueFasilitas::orderBy('urutan')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->checkEventMarketing();

        $data = $this->validasi($request, wajibFoto: true);
        $data['urutan'] = $this->urutan($data, null);
        $data['aktif']  = $request->boolean('aktif');
        $data['foto']   = $this->simpanFoto($request);

        try {
            VenueFasilitas::create($data);
        } catch (\Throwable $e) {
            // Berkas sudah pindah ke disk sebelum barisnya ditulis; kalau
            // penulisannya gagal, jangan tinggalkan foto yatim di public/venue.
            VenueFasilitas::hapusBerkas($data['foto']);
            throw $e;
        }

        return back()->with('success', 'Fasilitas venue ditambahkan.');
    }

    public function update(Request $request, $id)
    {
        $this->checkEventMarketing();

        $fasilitas = VenueFasilitas::findOrFail($id);

        $data = $this->validasi($request, wajibFoto: false);
        $data['urutan'] = $this->urutan($data, $fasilitas);
        $data['aktif']  = $request->boolean('aktif');

        $fotoLama = $fasilitas->foto;
        $fotoBaru = $request->hasFile('foto') ? $this->simpanFoto($request) : null;

        if ($fotoBaru) {
            $data['foto'] = $fotoBaru;
        } else {
            // Formulir selalu mengirim kolom foto, kosong pun. Tanpa ini,
            // menyunting nama fasilitas akan menghapus fotonya.
            unset($data['foto']);
        }

        try {
            $fasilitas->update($data);
        } catch (\Throwable $e) {
            VenueFasilitas::hapusBerkas($fotoBaru);
            throw $e;
        }

        // Foto lama baru dibuang setelah barisnya benar-benar tersimpan, supaya
        // kegagalan penyimpanan tidak meninggalkan baris tanpa foto.
        if ($fotoBaru) {
            VenueFasilitas::hapusBerkas($fotoLama);
        }

        return back()->with('success', 'Fasilitas venue diperbarui.');
    }

    public function destroy($id)
    {
        $this->checkEventMarketing();

        VenueFasilitas::findOrFail($id)->delete();

        return back()->with('success', 'Fasilitas venue dihapus.');
    }

    private function validasi(Request $request, bool $wajibFoto): array
    {
        return $request->validate([
            'nama'        => ['required', 'string', 'max:255'],
            'spesifikasi' => ['nullable', 'string', 'max:255'],
            'keterangan'  => ['nullable', 'string', 'max:500'],
            'urutan'      => ['nullable', 'integer', 'min:0', 'max:999'],
            'aktif'       => ['nullable', 'boolean'],
            'foto'        => UnggahGambar::aturan(wajib: $wajibFoto),
        ], UnggahGambar::pesan('foto', 'foto fasilitas'));
    }

    /**
     * Kolom urutan NOT NULL, sedangkan formulir mengirimkannya kosong ketika
     * pengguna tidak mengisinya. Kosong berarti: pertahankan urutan yang sudah
     * ada, atau letakkan di posisi terakhir untuk fasilitas baru.
     */
    private function urutan(array $data, ?VenueFasilitas $fasilitas): int
    {
        if (($data['urutan'] ?? null) !== null) {
            return (int) $data['urutan'];
        }

        return $fasilitas->urutan ?? ((int) VenueFasilitas::max('urutan') + 1);
    }

    /**
     * Simpan foto ke public/venue. Nama berkas WAJIB dari hashName(): ekstensinya
     * diturunkan dari MIME hasil pembacaan isi, bukan dari nama kiriman pengguna,
     * supaya berkas tidak bisa mendarat sebagai .php dan dieksekusi Nginx.
     */
    private function simpanFoto(Request $request): string
    {
        $file = $request->file('foto');
        $dir  = public_path('venue');

        // Di server, public/ sering dimiliki pengguna lain daripada yang
        // menjalankan PHP. Tanpa pemeriksaan ini galatnya muncul sebagai layar
        // 500 tanpa keterangan; dengan ini penyebabnya terbaca di formulir.
        if (! is_dir($dir) && ! @mkdir($dir, 0755, true) && ! is_dir($dir)) {
            throw ValidationException::withMessages([
                'foto' => 'Folder penyimpanan foto tidak dapat dibuat. Periksa izin tulis pada folder public.',
            ]);
        }

        if (! is_writable($dir)) {
            throw ValidationException::withMessages([
                'foto' => 'Folder penyimpanan foto tidak dapat ditulisi. Periksa izin folder public/venue.',
            ]);
        }

        $nama = $file->hashName();
        $file->move($dir, $nama);

        return 'venue/' . $nama;
    }
}
