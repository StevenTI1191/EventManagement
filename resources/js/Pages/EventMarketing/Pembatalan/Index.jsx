import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PembatalanIndex from '@/Pages/Pembatalan/Index';

export default function Index(props) {
    return <PembatalanIndex Layout={EventMarketingLayout} {...props} />;
}
