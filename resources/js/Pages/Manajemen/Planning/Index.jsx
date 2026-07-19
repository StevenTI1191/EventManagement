import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PlanningIndex from '@/Pages/Planning/Index';

export default function Index({ events, jenis, jumlah }) {
    return (
        <PlanningIndex
            Layout={ManajemenLayout}
            events={events}
            jenis={jenis}
            jumlah={jumlah}
            routes={{ create: 'manajemen.planning.create', show: 'manajemen.planning.show', index: 'manajemen.planning.index' }}
        />
    );
}
