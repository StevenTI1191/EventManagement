import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import PlanningCreate from '@/Pages/Planning/Create';

export default function Create(props) {
    return <PlanningCreate Layout={EventMarketingLayout} {...props} />;
}
