<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPipeline;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PipelineController extends Controller
{
    use ChecksPegawaiRole, ManagesPipeline;

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
}
