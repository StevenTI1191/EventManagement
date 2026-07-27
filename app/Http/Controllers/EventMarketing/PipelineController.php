<?php

namespace App\Http\Controllers\EventMarketing;

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
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/Pipeline/Board', [
            'kolom'   => $this->pipelineColumns(),
            'canEdit' => true,
        ]);
    }

    public function updateStatus(Request $request, $id_event)
    {
        $this->checkEventMarketing();

        return $this->handlePipelineUpdate($request, $id_event);
    }

    /** Unduh PDF penawaran untuk dikirim ke klien (tahap Negotiation). */
    public function penawaran($id_event)
    {
        $this->checkEventMarketing();

        return $this->unduhPenawaran($id_event);
    }

    /** Tandai prospek tidak jadi (batal) di tahap Lead/Negotiation. */
    public function batal(Request $request, $id_event)
    {
        $this->checkEventMarketing();

        return $this->handlePipelineBatal($request, $id_event);
    }

    /** Ajukan (atau ajukan ulang) penawaran untuk disetujui Manajemen. */
    public function ajukanPenawaran($id_event)
    {
        $this->checkEventMarketing();

        return $this->ajukanUlangPenawaran($id_event);
    }
}
