import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import TaskDivisiBoard from '@/Pages/TaskDivisi/Board';

export default function Board({ events, routes }) {
    return <TaskDivisiBoard Layout={EventMarketingLayout} events={events} routes={routes} />;
}
