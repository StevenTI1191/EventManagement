import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import EventDetail from '@/Pages/Event/Detail';

export default function Detail(props) {
    return <EventDetail Layout={EventMarketingLayout} {...props} />;
}
