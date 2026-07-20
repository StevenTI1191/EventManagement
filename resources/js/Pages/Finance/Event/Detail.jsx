import FinanceLayout from '@/Layouts/FinanceLayout';
import EventDetail from '@/Pages/Event/Detail';

export default function Detail(props) {
    return <EventDetail Layout={FinanceLayout} {...props} />;
}
