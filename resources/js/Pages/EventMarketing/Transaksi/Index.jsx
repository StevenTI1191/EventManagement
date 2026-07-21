import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import TransaksiIndex from '@/Pages/Transaksi/Index';

// Halaman transaksi Event Marketing memakai komponen yang sama persis dengan
// Finance — hanya berbeda layout & prefix rute (em.transaksi.*).
export default function Index(props) {
    return <TransaksiIndex Layout={EventMarketingLayout} prefix="em" {...props} />;
}
