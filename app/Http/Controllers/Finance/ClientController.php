<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ShowsClient;

/**
 * Data klien sisi Finance — isinya sama persis dengan Event Marketing,
 * hanya tanpa wewenang mengubah. Sebelumnya Finance punya versi sendiri yang
 * lebih dangkal: tanpa pemisahan sumber klien dan tanpa riwayat follow-up.
 */
class ClientController extends Controller
{
    use ChecksPegawaiRole, ShowsClient;

    private function rute(): array
    {
        return [
            'index' => 'finance.client.index',
            'show'  => 'finance.client.show',
        ];
    }

    public function index(Request $request)
    {
        $this->checkFinance();

        return $this->daftarClient($request, 'Finance/Client/Index', $this->rute(), canEdit: false);
    }

    public function show($id)
    {
        $this->checkFinance();

        return $this->detailClient($id, 'Finance/Client/Show', $this->rute(), canEdit: false);
    }
}
