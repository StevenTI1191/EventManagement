<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ShowsTransaksi;

/**
 * Buku transaksi bagi Event Marketing — HANYA UNTUK DILIHAT.
 *
 * Event Marketing perlu mengetahui posisi pembayaran acara yang ditanganinya,
 * tetapi pembukuannya bukan wewenangnya: pencatatan, perubahan, dan penghapusan
 * transaksi tetap milik Finance agar angka pada buku kas punya satu pemilik dan
 * koreksinya dapat dipertanggungjawabkan.
 *
 * Karena itu controller ini memakai ShowsTransaksi (baca) dan BUKAN
 * ManagesTransaksi (tulis) — kemampuan menulisnya tidak diwarisi sama sekali,
 * bukan sekadar tidak dipasangi rute.
 */
class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    use ShowsTransaksi;

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Transaksi/Index', $this->transaksiIndexData($request));
    }
}
