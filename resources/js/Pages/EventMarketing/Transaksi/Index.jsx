import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import TransaksiIndex from '@/Pages/Transaksi/Index';

// Halaman transaksi Event Marketing memakai komponen yang sama persis dengan
// Finance — hanya berbeda layout & prefix rute (em.transaksi.*).
//
// bolehUbah={false}: Event Marketing hanya memantau posisi pembayaran acara yang
// ditanganinya. Pencatatan, perubahan, dan penghapusan transaksi adalah wewenang
// Finance, dan rute tulis untuk peran ini memang tidak didaftarkan.
export default function Index(props) {
    return <TransaksiIndex Layout={EventMarketingLayout} prefix="em" {...props} bolehUbah={false} />;
}
