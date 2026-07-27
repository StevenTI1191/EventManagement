<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Models\VenueFasilitas;
use App\Traits\ChecksPegawaiRole;
use Illuminate\Http\Request;
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

    /** Batas foto: cukup besar untuk tampilan galeri, tidak membebani halaman. */
    private const MAKS_KB = 8192;

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
        $data['foto'] = $this->simpanFoto($request);
        $data['urutan'] = $data['urutan'] ?? ((int) VenueFasilitas::max('urutan') + 1);

        VenueFasilitas::create($data);

        return back()->with('success', 'Fasilitas venue ditambahkan.');
    }

    public function update(Request $request, $id)
    {
        $this->checkEventMarketing();

        $fasilitas = VenueFasilitas::findOrFail($id);
        $data = $this->validasi($request, wajibFoto: false);

        // Foto lama baru dibuang setelah yang baru berhasil tersimpan.
        if ($request->hasFile('foto')) {
            $baru = $this->simpanFoto($request);
            $fasilitas->hapusFoto();
            $data['foto'] = $baru;
        }

        $fasilitas->update($data);

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
            'foto'        => [$wajibFoto ? 'required' : 'nullable', 'file', 'image', 'max:' . self::MAKS_KB],
        ], [
            'foto.required' => 'Unggah foto fasilitasnya.',
            'foto.image'    => 'Berkas harus berupa gambar.',
            'foto.max'      => 'Ukuran foto maksimal 8 MB.',
        ]);
    }

    /**
     * Simpan foto ke public/venue. Nama berkas WAJIB dari hashName(): ekstensinya
     * diturunkan dari MIME hasil pembacaan isi, bukan dari nama kiriman pengguna,
     * supaya berkas tidak bisa mendarat sebagai .php dan dieksekusi Nginx.
     */
    private function simpanFoto(Request $request): ?string
    {
        if (! $request->hasFile('foto')) {
            return null;
        }

        $file = $request->file('foto');
        $dir  = public_path('venue');

        if (! file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $nama = $file->hashName();
        $file->move($dir, $nama);

        return 'venue/' . $nama;
    }
}
