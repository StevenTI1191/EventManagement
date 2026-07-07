import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PlanningIndex from '@/Pages/Planning/Index';

export default function Index({ events }) {
    return (
        <PlanningIndex
            Layout={EventMarketingLayout}
            events={events}
            routes={{ create: 'em.planning.create', show: 'em.planning.show' }}
        />
    );
}
