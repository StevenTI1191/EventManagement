import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PlanningBoard from '@/Pages/Planning/Board';

export default function Board(props) {
    return <PlanningBoard Layout={EventMarketingLayout} {...props} />;
}
