import FinanceLayout from '@/Layouts/FinanceLayout';
import KlienIndex from '@/Pages/Klien/Index';

export default function Index(props) {
    return <KlienIndex Layout={FinanceLayout} {...props} />;
}
