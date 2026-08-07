<?php

namespace App\Traits;

use App\Models\Event;
use App\Models\Transaksi;
use App\Support\UnggahGambar;
use App\Models\TransaksiItem;
use App\Support\PelunasanInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Operasi TULIS buku transaksi per event: pencatatan pembayaran (uang masuk yang
 * dikaitkan ke pelunasan invoice) dan item pemasukan/pengeluaran lain. Dipakai
 * bersama oleh peran yang berwenang membukukan — Finance dan Manajemen — agar
 * keduanya memakai aturan yang persis sama.
 *
 * Pembacaan buku transaksi ada di ShowsTransaksi, yang sudah tercakup di sini.
 * Peran yang hanya boleh melihat cukup memakai trait itu saja, supaya tidak ikut
 * mewarisi kemampuan menulis hanya karena butuh menampilkan tabelnya.
 *
 * Controller pemakai wajib menyediakan checkTransaksiAkses() untuk menegakkan
 * peran yang boleh membukukan.
 */
trait ManagesTransaksi
{
    use ShowsTransaksi;

    /** Tegakkan peran yang boleh membukukan transaksi. */
    abstract protected function checkTransaksiAkses(): void;

    /** Catat pembayaran (uang masuk) untuk sebuah event. */
    public function store(Request $request)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'id_event'   => 'required|exists:events,id_event',
            'nominal'    => 'required|numeric|min:1|max:9999999999999',
            'tgl_bayar'  => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'bukti_file' => UnggahGambar::aturan(maksKb: 2048),
        ]);

        $data = $request->only(['id_event', 'nominal', 'tgl_bayar', 'keterangan']);
        $data['id_pegawai'] = Auth::guard('pegawai')->user()->id_pegawai;

        if ($request->hasFile('bukti_file') && $request->file('bukti_file')->isValid()) {
            $file     = $request->file('bukti_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('bukti-transaksi', $file, $filename);
            $data['bukti_file'] = $filename;
        }

        $transaksi = Transaksi::create($data);

        // Pembayaran yang dicatat langsung juga melunasi tagihannya — tanpa ini
        // invoice tetap "Belum Dibayar" dan klien terus dikirimi pengingat
        // jatuh tempo untuk uang yang sudah mereka bayar.
        PelunasanInvoice::sinkron($transaksi->id_event);

        return back();
    }

    /** Ubah nominal / tanggal / bukti sebuah pembayaran. */
    public function update(Request $request, $id)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'nominal'    => 'required|numeric|min:1|max:9999999999999',
            'tgl_bayar'  => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'bukti_file' => UnggahGambar::aturan(maksKb: 2048),
        ]);

        $transaksi = Transaksi::findOrFail($id);
        $data = $request->only(['nominal', 'tgl_bayar', 'keterangan']);

        if ($request->hasFile('bukti_file') && $request->file('bukti_file')->isValid()) {
            if ($transaksi->bukti_file) {
                Storage::disk('local')->delete('bukti-transaksi/' . $transaksi->bukti_file);
            }
            $file     = $request->file('bukti_file');
            $filename = $file->hashName();
            Storage::disk('local')->putFileAs('bukti-transaksi', $file, $filename);
            $data['bukti_file'] = $filename;
        }

        $lama = $transaksi->id_event;
        $transaksi->update($data);

        // Nominal atau eventnya bisa berubah — hitung ulang keduanya.
        PelunasanInvoice::sinkron($lama);
        if ($transaksi->id_event !== $lama) {
            PelunasanInvoice::sinkron($transaksi->id_event);
        }

        return back();
    }

    /** Hapus sebuah pembayaran. */
    public function destroy($id)
    {
        $this->checkTransaksiAkses();

        $transaksi = Transaksi::findOrFail($id);
        $idEvent   = $transaksi->id_event;

        if ($transaksi->bukti_file) {
            Storage::disk('local')->delete('bukti-transaksi/' . $transaksi->bukti_file);
        }
        $transaksi->delete();

        // Uang ditarik kembali → status tagihannya ikut dihitung ulang.
        PelunasanInvoice::sinkron($idEvent);

        return back();
    }

    /** Tambah item pemasukan / pengeluaran lain untuk sebuah event. */
    public function storeItem(Request $request)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'id_event'   => 'required|exists:events,id_event',
            'tipe'       => 'required|in:Pemasukan,Pengeluaran',
            'nama_item'  => 'required|string|max:255',
            'qty'        => 'required|integer|min:1|max:100000',
            'harga'      => 'required|numeric|min:0|max:9999999999999',
            'keterangan' => 'nullable|string|max:2000',
        ]);

        TransaksiItem::create([
            'id_event'   => $request->id_event,
            'tipe'       => $request->tipe,
            'nama_item'  => $request->nama_item,
            'qty'        => $request->qty,
            'harga'      => $request->harga,
            'total'      => $request->qty * $request->harga,
            'keterangan' => $request->keterangan,
        ]);

        return back();
    }

    /** Ubah item pemasukan / pengeluaran. */
    public function updateItem(Request $request, $id)
    {
        $this->checkTransaksiAkses();

        $request->validate([
            'tipe'       => 'required|in:Pemasukan,Pengeluaran',
            'nama_item'  => 'required|string|max:255',
            'qty'        => 'required|integer|min:1|max:100000',
            'harga'      => 'required|numeric|min:0|max:9999999999999',
            'keterangan' => 'nullable|string|max:2000',
        ]);

        $item = TransaksiItem::findOrFail($id);
        $item->update([
            'tipe'       => $request->tipe,
            'nama_item'  => $request->nama_item,
            'qty'        => $request->qty,
            'harga'      => $request->harga,
            'total'      => $request->qty * $request->harga,
            'keterangan' => $request->keterangan,
        ]);

        return back();
    }

    /** Hapus item pemasukan / pengeluaran. */
    public function destroyItem($id)
    {
        $this->checkTransaksiAkses();

        TransaksiItem::findOrFail($id)->delete();

        return back();
    }
}
