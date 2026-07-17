<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesTaskDivisi;
use Inertia\Inertia;

class TaskDivisiController extends Controller
{
    use ChecksPegawaiRole, ManagesTaskDivisi;

    public function index()
    {
        $this->checkEventMarketing();

        return Inertia::render('EventMarketing/TaskDivisi/Board', [
            'events' => $this->taskDivisiEvents(),
            'routes' => [
                'todo'     => 'em.todo.index',
                'planning' => 'em.planning.show',
            ],
        ]);
    }
}
