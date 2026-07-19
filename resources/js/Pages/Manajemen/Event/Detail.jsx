import ManajemenLayout from '@/Layouts/ManajemenLayout';
import EventDetail from '@/Pages/Event/Detail';

export default function Detail(props) {
    return <EventDetail Layout={ManajemenLayout} {...props} />;
}
