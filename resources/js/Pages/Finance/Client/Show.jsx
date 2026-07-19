import FinanceLayout from '@/Layouts/FinanceLayout';
import KlienShow from '@/Pages/Klien/Show';

export default function Show(props) {
    return <KlienShow Layout={FinanceLayout} {...props} />;
}
