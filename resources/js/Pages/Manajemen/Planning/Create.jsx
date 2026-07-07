import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PlanningCreate from '@/Pages/Planning/Create';

export default function Create(props) {
    return <PlanningCreate Layout={ManajemenLayout} {...props} />;
}
