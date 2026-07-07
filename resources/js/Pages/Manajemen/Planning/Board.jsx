import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PlanningBoard from '@/Pages/Planning/Board';

export default function Board(props) {
    return <PlanningBoard Layout={ManajemenLayout} {...props} />;
}
