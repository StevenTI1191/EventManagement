import ManajemenLayout from '@/Layouts/ManajemenLayout';
import PembatalanIndex from '@/Pages/Pembatalan/Index';

export default function Index(props) {
    return <PembatalanIndex Layout={ManajemenLayout} {...props} />;
}
