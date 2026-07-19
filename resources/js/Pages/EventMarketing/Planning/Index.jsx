import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PlanningIndex from '@/Pages/Planning/Index';

export default function Index({ events, jenis, jumlah }) {
    return (
        <PlanningIndex
            Layout={EventMarketingLayout}
            events={events}
            jenis={jenis}
            jumlah={jumlah}
            routes={{ create: 'em.planning.create', show: 'em.planning.show', index: 'em.planning.index' }}
        />
    );
}
