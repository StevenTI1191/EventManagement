import ManajemenLayout from '@/Layouts/ManajemenLayout';
import KlienIndex from '@/Pages/Klien/Index';

export default function ClientIndex(props) {
    return <KlienIndex Layout={ManajemenLayout} {...props} />;
}
