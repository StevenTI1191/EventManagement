import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import KlienIndex from '@/Pages/Klien/Index';

export default function Index(props) {
    return <KlienIndex Layout={EventMarketingLayout} {...props} />;
}
