import ManajemenLayout from '@/Layouts/ManajemenLayout';
import TaskDivisiBoard from '@/Pages/TaskDivisi/Board';

export default function Board({ events, routes }) {
    return <TaskDivisiBoard Layout={ManajemenLayout} events={events} routes={routes} />;
}
