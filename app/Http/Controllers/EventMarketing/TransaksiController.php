<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTransaksi;

class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    // Membukukan transaksi persis seperti Finance (index/store/update/destroy + item).
    use ManagesTransaksi;

    protected function checkTransaksiAkses(): void
    {
        $this->checkEventMarketing();
    }

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Transaksi/Index', $this->transaksiIndexData($request));
    }
}
