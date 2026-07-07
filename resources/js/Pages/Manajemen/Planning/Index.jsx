import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PlanningIndex from '@/Pages/Planning/Index';

export default function Index({ events }) {
    return (
        <PlanningIndex
            Layout={ManajemenLayout}
            events={events}
            routes={{ create: 'manajemen.planning.create', show: 'manajemen.planning.show' }}
        />
    );
}
