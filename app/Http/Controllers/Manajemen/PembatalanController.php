<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPembatalan;
use Illuminate\Http\Request;

/** Manajemen — persetujuan pembatalan tahap 3 (akhir + pemrosesan refund). */
class PembatalanController extends Controller
{
    use ChecksPegawaiRole;
    use ManagesPembatalan;

    private function rute(): array
    {
        return [
            'setujui' => 'manajemen.pembatalan.setujui',
            'tolak'   => 'manajemen.pembatalan.tolak',
        ];
    }

    public function index()
    {
        $this->checkManajemen();

        return $this->daftarPembatalan('Manajemen/Pembatalan/Index', $this->rute(), 'Manajemen');
    }

    public function setujui($id)
    {
        $this->checkManajemen();

        return $this->accManajemen($id);
    }

    public function tolak(Request $request, $id)
    {
        $this->checkManajemen();

        return $this->tolakPembatalan($request, $id, 'Manajemen');
    }
}
