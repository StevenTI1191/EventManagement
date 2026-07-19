import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import KlienShow from '@/Pages/Klien/Show';

export default function Show(props) {
    return <KlienShow Layout={EventMarketingLayout} {...props} />;
}
