<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTransaksi;

class TransaksiController extends Controller
{
    use ChecksPegawaiRole;
    // Operasi tulis (pembayaran & item) dibagikan dengan Event Marketing.
    use ManagesTransaksi;

    protected function checkTransaksiAkses(): void
    {
        $this->checkFinance();
    }


    public function index(Request $request)
    {
        $this->checkFinance();

        return Inertia::render('Finance/Transaksi/Index', $this->transaksiIndexData($request));
    }
}
