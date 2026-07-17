<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTaskDivisi;
use Inertia\Inertia;

class TaskDivisiController extends Controller
{
    use ChecksPegawaiRole, ManagesTaskDivisi;

    public function index()
    {
        $this->checkManajemen();

        return Inertia::render('Manajemen/TaskDivisi/Board', [
            'events' => $this->taskDivisiEvents(),
            'routes' => [
                'todo'     => 'manajemen.todo.index',
                'planning' => 'manajemen.planning.show',
            ],
        ]);
    }
}
