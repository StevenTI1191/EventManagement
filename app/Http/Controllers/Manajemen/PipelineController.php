<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPersetujuanPenawaran;
use App\Traits\ManagesPipeline;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PipelineController extends Controller
{
    use ChecksPegawaiRole, ManagesPipeline, ManagesPersetujuanPenawaran;

    public function index()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/Pipeline/Board', [
            'kolom'   => $this->pipelineColumns(),
            'canEdit' => true,
        ]);
    }

    public function updateStatus(Request $request, $id_event)
    {
        $this->checkManajemen();

        return $this->handlePipelineUpdate($request, $id_event);
    }

    /** Unduh PDF penawaran untuk dikirim ke klien (tahap Negotiation). */
    public function penawaran($id_event)
    {
        $this->checkManajemen();

        return $this->unduhPenawaran($id_event);
    }

    /** Tandai prospek tidak jadi (batal) di tahap Lead/Negotiation. */
    public function batal(Request $request, $id_event)
    {
        $this->checkManajemen();

        return $this->handlePipelineBatal($request, $id_event);
    }

    /** Setujui penawaran — dokumennya dikirim ke klien saat ini juga. */
    public function setujuiPenawaranAksi($id_event)
    {
        $this->checkManajemen();

        return $this->setujuiPenawaran($id_event);
    }

    /** Tolak penawaran beserta catatan perbaikan untuk Event Marketing. */
    public function tolakPenawaranAksi(Request $request, $id_event)
    {
        $this->checkManajemen();

        return $this->tolakPenawaranManajemen($request, $id_event);
    }
}
