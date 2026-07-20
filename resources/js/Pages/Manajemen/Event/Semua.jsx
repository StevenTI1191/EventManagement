import ManajemenLayout from '@/Layouts/ManajemenLayout';
import EventSemua from '@/Pages/Event/Semua';

export default function Semua(props) {
    return <EventSemua Layout={ManajemenLayout} {...props} />;
}
