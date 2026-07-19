import ManajemenLayout from '@/Layouts/ManajemenLayout';
import TransaksiIndex from '@/Pages/Transaksi/Index';

export default function Index(props) {
    return <TransaksiIndex Layout={ManajemenLayout} prefix="manajemen" {...props} />;
}
