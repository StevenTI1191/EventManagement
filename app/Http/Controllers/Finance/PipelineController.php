<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesPipeline;
use Inertia\Inertia;

/**
 * Finance hanya boleh MELIHAT pipeline (tidak bisa menggeser kartu).
 * Karena itu controller ini sengaja tidak menyediakan updateStatus().
 */
class PipelineController extends Controller
{
    use ChecksPegawaiRole, ManagesPipeline;

    public function index()
    {
        $this->checkFinance();

        return Inertia::render('Finance/Pipeline/Board', [
            'kolom'   => $this->pipelineColumns(),
            'canEdit' => false,
        ]);
    }
}
