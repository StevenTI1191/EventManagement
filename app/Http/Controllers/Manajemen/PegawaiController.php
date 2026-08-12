<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

use App\Traits\ChecksPegawaiRole;

class PegawaiController extends Controller
{
    use ChecksPegawaiRole;
    public function index()
    {
        $this->checkManajemen();

        $currentUser = Auth::guard('pegawai')->user();

        $internal = Pegawai::withCount('events')
            ->where('jenis_pegawai', 'Internal')
            ->where('id_pegawai', '!=', $currentUser->id_pegawai)
            // Lewat scope, bukan perbandingan teks persis: baris lama yang
            // posisinya tertulis dengan spasi atau kapital berbeda tetap
            // terkecualikan. Aturan barisnya sudah dipatok Rule::in untuk
            // pegawai internal, jadi ini pengaman bagi data sebelum aturan itu.
            ->whereNot(fn ($q) => $q->pemegangPeran('Manajemen'))
            ->latest()
            ->paginate(10, ['*'], 'page_internal')
            ->withQueryString();

        $eksternal = Pegawai::withCount('events')
            ->where('jenis_pegawai', 'Eksternal')
            ->where('id_pegawai', '!=', $currentUser->id_pegawai)
            ->latest()
            ->paginate(10, ['*'], 'page_eksternal')
            ->withQueryString();

        return Inertia::render('Manajemen/Pegawai/Index', [
            'internal' => $internal,
            'eksternal' => $eksternal,
        ]);
    }

    public function create()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Pegawai/Create');
    }

    public function store(Request $request)
    {
        $this->checkManajemen();

        // Posisi pegawai internal terbatas pada tiga peran backstage. Posisi
        // pegawai eksternal dibiarkan bebas sebab jabatan tenaga lepas memang
        // bermacam-macam — TETAPI tidak boleh menyamai nama peran backstage,
        // walau berbeda huruf besar-kecil maupun spasi. Tanpa larangan itu,
        // seorang tenaga lepas berjabatan "finance" menjadi tidak dapat
        // dibedakan dari Tim Finance pada layar mana pun, dan setiap
        // pemeriksaan yang lupa menimbang jenis pegawainya akan meloloskannya.
        $posisiRule = $request->jenis_pegawai === Pegawai::JENIS_INTERNAL
            ? ['required', Rule::in(Pegawai::PERAN_INTERNAL)]
            : ['required', 'string', 'max:255', function ($attr, $value, $fail) {
                foreach (Pegawai::PERAN_INTERNAL as $peran) {
                    if (Pegawai::normalPeran($value) === Pegawai::normalPeran($peran)) {
                        $fail("Posisi \"{$peran}\" hanya untuk pegawai internal. "
                            . 'Gunakan sebutan lain untuk tenaga eksternal.');
                    }
                }
            }];

        $request->validate([
            'nama_pegawai'     => 'required|string|max:255',
            'jenis_pegawai'    => 'required|in:Internal,Eksternal',
            'posisi_pegawai'   => $posisiRule,
            'no_hp_pegawai'    => 'required|string|max:20',
            'email_pegawai'    => 'required|email|unique:pegawais,email_pegawai',
            'password_pegawai' => 'required|string|min:8|max:255',
            'gaji_pokok'       => 'nullable|numeric|min:0|max:9999999999999',
        ]);

        Pegawai::create([
            'nama_pegawai'       => $request->nama_pegawai,
            'jenis_pegawai'      => $request->jenis_pegawai,
            'posisi_pegawai'     => $request->posisi_pegawai,
            'no_hp_pegawai'      => $request->no_hp_pegawai,
            'email_pegawai'      => $request->email_pegawai,
            'password_pegawai'   => Hash::make($request->password_pegawai),
            'rekomendasi_rehire' => 'Yes',
            'gaji_pokok'         => $request->gaji_pokok ?? 0, // ← tambahkan ini
        ]);

        return redirect()->route('manajemen.pegawai.index')
            ->with('success', 'Pegawai berhasil ditambahkan.');
    }

    public function update(Request $request, $id)
    {
        $this->checkManajemen();

        $pegawai = Pegawai::findOrFail($id);

        // Posisi pegawai internal terbatas pada tiga peran backstage. Posisi
        // pegawai eksternal dibiarkan bebas sebab jabatan tenaga lepas memang
        // bermacam-macam — TETAPI tidak boleh menyamai nama peran backstage,
        // walau berbeda huruf besar-kecil maupun spasi. Tanpa larangan itu,
        // seorang tenaga lepas berjabatan "finance" menjadi tidak dapat
        // dibedakan dari Tim Finance pada layar mana pun, dan setiap
        // pemeriksaan yang lupa menimbang jenis pegawainya akan meloloskannya.
        $posisiRule = $request->jenis_pegawai === Pegawai::JENIS_INTERNAL
            ? ['required', Rule::in(Pegawai::PERAN_INTERNAL)]
            : ['required', 'string', 'max:255', function ($attr, $value, $fail) {
                foreach (Pegawai::PERAN_INTERNAL as $peran) {
                    if (Pegawai::normalPeran($value) === Pegawai::normalPeran($peran)) {
                        $fail("Posisi \"{$peran}\" hanya untuk pegawai internal. "
                            . 'Gunakan sebutan lain untuk tenaga eksternal.');
                    }
                }
            }];

        $request->validate([
            'nama_pegawai'   => 'required|string|max:255',
            'jenis_pegawai'  => 'required|in:Internal,Eksternal',
            'posisi_pegawai' => $posisiRule,
            'no_hp_pegawai'  => 'required|string|max:20',
            'email_pegawai'  => 'required|email|unique:pegawais,email_pegawai,' . $id . ',id_pegawai',
            'gaji_pokok'       => 'nullable|numeric|min:0|max:9999999999999',
            'password_pegawai' => 'nullable|string|min:8|max:255',
        ]);

        $data = $request->only([
            'nama_pegawai',
            'jenis_pegawai',
            'posisi_pegawai',
            'no_hp_pegawai',
            'email_pegawai',
            'gaji_pokok', // ← tambahkan ini
        ]);

        if ($request->filled('password_pegawai')) {
            $data['password_pegawai'] = Hash::make($request->password_pegawai);
        }

        $pegawai->update($data);

        return redirect()->route('manajemen.pegawai.index')
            ->with('success', 'Pegawai berhasil diupdate.');
    }
    public function destroy($id)
    {
        $this->checkManajemen();

        $pegawai = Pegawai::withCount('events')->findOrFail($id);

        // Blokir penghapusan jika pegawai masih memiliki event terkait.
        // Menghapus pegawai akan cascade-delete SEMUA event, transaksi,
        // tugas, bukti pembayaran, dan appointment milik mereka.
        if ($pegawai->events_count > 0) {
            return redirect()->route('manajemen.pegawai.index')
                ->with('error', "Pegawai \"{$pegawai->nama_pegawai}\" tidak bisa dihapus karena masih memiliki {$pegawai->events_count} event terkait. Hapus atau alihkan event terlebih dahulu.");
        }

        $pegawai->delete();
        return redirect()->route('manajemen.pegawai.index')
            ->with('success', 'Pegawai berhasil dihapus.');
    }
    public function updateNote(Request $request, $id)
    {
        $this->checkManajemen();

        $pegawai = Pegawai::findOrFail($id);

        $request->validate([
            'note_pegawai' => 'nullable|string|max:2000',
        ]);

        $pegawai->update([
            'note_pegawai' => $request->note_pegawai,
        ]);

        return back()->with('success', 'Catatan berhasil disimpan.');
    }
    public function edit($id)
    {
        $this->checkManajemen();

        $pegawai = Pegawai::findOrFail($id);
        return Inertia::render('Manajemen/Pegawai/Edit', [
            'pegawai' => $pegawai,
        ]);
    }
}
