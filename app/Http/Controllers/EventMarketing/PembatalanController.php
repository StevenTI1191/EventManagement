<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPembatalan;
use Illuminate\Http\Request;

/** Event Marketing — persetujuan pembatalan tahap 1. */
class PembatalanController extends Controller
{
    use ChecksPegawaiRole;
    use ManagesPembatalan;

    private function rute(): array
    {
        return [
            'setujui' => 'em.pembatalan.setujui',
            'tolak'   => 'em.pembatalan.tolak',
        ];
    }

    public function index()
    {
        $this->checkEventMarketing();

        return $this->daftarPembatalan('EventMarketing/Pembatalan/Index', $this->rute(), 'EventMarketing');
    }

    public function setujui($id)
    {
        $this->checkEventMarketing();

        return $this->accEM($id);
    }

    public function tolak(Request $request, $id)
    {
        $this->checkEventMarketing();

        // Peran dikirim dalam bentuk kanonis (tanpa spasi), sama seperti nilai
        // yang dikembalikan EventPembatalan::giliran() — itulah yang dipakai
        // trait untuk menentukan giliran. Labelnya dirapikan di sana.
        return $this->tolakPembatalan($request, $id, 'EventMarketing');
    }
}
