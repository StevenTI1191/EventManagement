<?php

namespace App\Http\Controllers\Manajemen;

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
}
