<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPembatalan;
use Illuminate\Http\Request;

/** Finance — persetujuan pembatalan tahap 2 (menetapkan nominal refund). */
class PembatalanController extends Controller
{
    use ChecksPegawaiRole;
    use ManagesPembatalan;

    private function rute(): array
    {
        return [
            'setujui' => 'finance.pembatalan.setujui',
            'tolak'   => 'finance.pembatalan.tolak',
        ];
    }

    public function index()
    {
        $this->checkFinance();

        return $this->daftarPembatalan('Finance/Pembatalan/Index', $this->rute(), 'Finance');
    }

    public function setujui(Request $request, $id)
    {
        $this->checkFinance();

        return $this->accFinance($request, $id);
    }

    public function tolak(Request $request, $id)
    {
        $this->checkFinance();

        return $this->tolakPembatalan($request, $id, 'Finance');
    }
}
