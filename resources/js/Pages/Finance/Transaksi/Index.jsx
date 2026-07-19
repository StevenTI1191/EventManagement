import FinanceLayout from '@/Layouts/FinanceLayout';
import TransaksiIndex from '@/Pages/Transaksi/Index';

export default function Index(props) {
    return <TransaksiIndex Layout={FinanceLayout} prefix="finance" {...props} />;
}
