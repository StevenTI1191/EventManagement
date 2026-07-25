import FinanceLayout from '@/Layouts/FinanceLayout';
import PembatalanIndex from '@/Pages/Pembatalan/Index';

export default function Index(props) {
    return <PembatalanIndex Layout={FinanceLayout} {...props} />;
}
