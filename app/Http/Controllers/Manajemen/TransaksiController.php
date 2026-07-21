<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTransaksi;

class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    // Buku transaksi (index + store/update/destroy pembayaran & item) dibagikan
    // dengan Finance & Event Marketing lewat trait ManagesTransaksi.
    use ManagesTransaksi;

    protected function checkTransaksiAkses(): void
    {
        $this->checkManajemen();
    }

    public function index(Request $request)
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Transaksi/Index', $this->transaksiIndexData($request));
    }
}
