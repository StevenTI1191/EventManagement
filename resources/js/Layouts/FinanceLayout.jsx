import { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    LayoutDashboard, Calendar, CalendarDays, CreditCard,
    LogOut, ChevronLeft, ChevronRight, Users, Receipt,
    Bell, Trash2, CheckCheck, Upload, FileBarChart, StickyNote,
} from 'lucide-react';

export default function FinanceLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showNotif, setShowNotif]         = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread]               = useState(0);
    const notifRef                          = useRef(null);

    const currentPath = window.location.pathname;

    const menuItems = [
        { name: 'Dashboard',        icon: LayoutDashboard, href: route('finance.dashboard'),       active: currentPath === '/finance/dashboard' },
        { name: 'Jadwal Acara',     icon: CalendarDays,    href: route('finance.jadwal.index'),    active: currentPath.includes('/finance/jadwal') },
        { name: 'Event',            icon: Calendar,        href: route('finance.event.index'),     active: currentPath.includes('/finance/event') },
        { name: 'Client',           icon: Users,           href: route('finance.client.index'),    active: currentPath.includes('/finance/client') },
        { name: 'Transaksi',        icon: CreditCard,      href: route('finance.transaksi.index'), active: currentPath.includes('/finance/transaksi') },
        { name: 'Bukti Pembayaran', icon: Receipt,         href: route('finance.bukti.index'),     active: currentPath.includes('/finance/bukti-pembayaran') },
        { name: 'Laporan',          icon: FileBarChart,    href: route('finance.laporan.index'),   active: currentPath.includes('/finance/laporan') },
    ];

    // Fetch notifikasi awal dari DB
    const fetchNotif = async () => {
        try {
            const res = await axios.get('/finance/notifikasi');
            setNotifications(res.data.notifikasi);
            setUnread(res.data.unread);
        } catch {}
    };

    useEffect(() => {
        fetchNotif();

        // WebSocket: dengarkan channel 'finance' (hanya jika Pusher/Echo dikonfigurasi)
        if (typeof window.Echo === 'undefined') return;

        const channel = window.Echo.channel('finance');
        channel.listen('.bukti.uploaded', (data) => {
            setNotifications(prev => [data, ...prev]);
            setUnread(prev => prev + 1);
        });

        return () => {
            window.Echo.leaveChannel('finance');
        };
    }, []);

    // Tutup dropdown kalau klik di luar
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpenNotif = () => {
        setShowNotif(prev => !prev);
    };

    const markAllRead = async () => {
        await axios.post('/finance/notifikasi/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const removeNotif = async (id) => {
        await axios.delete('/finance/notifikasi/' + id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const formatTime = (tgl) => {
        if (!tgl) return '';
        const d = new Date(tgl);
        const now = new Date();
        const diffMs = now - d;
        const diffM = Math.floor(diffMs / 60000);
        if (diffM < 1)   return 'Baru saja';
        if (diffM < 60)  return `${diffM} menit lalu`;
        if (diffM < 1440)return `${Math.floor(diffM / 60)} jam lalu`;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-50`}>

                {/* LOGO & TOGGLE */}
                <div className="flex items-center justify-between p-5 mb-4">
                    <div className="flex items-center justify-center flex-shrink-0 overflow-hidden bg-black rounded-full w-14 h-14">
                        <img src="/images/LaksamanaLogo.png" alt="Laksamana Muda" className="object-contain w-12 h-12" />
                    </div>
                    {isSidebarOpen && (
                        <span className="flex-1 ml-3 text-sm font-bold tracking-tight text-gray-800">Finance</span>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                {/* MENU */}
                <nav className="flex-1 px-3 space-y-1">
                    {menuItems.map((item) => (
                        <Link key={item.name} href={item.href}
                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                item.active
                                    ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}>
                            <div className="relative flex-shrink-0">
                                <item.icon size={20} />
                                {/* Dot kecil saat sidebar collapse */}
                                {item.name === 'Bukti Pembayaran' && unread > 0 && !isSidebarOpen && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF2D55] rounded-full border-2 border-white" />
                                )}
                            </div>
                            {isSidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                            {/* Badge angka saat sidebar open */}
                            {item.name === 'Bukti Pembayaran' && unread > 0 && isSidebarOpen && (
                                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-black bg-white text-[#FF2D55] rounded-full leading-none">
                                    {unread}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* PROFILE & LOGOUT */}
                <div className="p-4 border-t border-gray-100">
                    <div className={`flex items-center gap-3 p-2 mb-2 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-[#FF2D55]/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#FF2D55]">
                            {user.nama_pegawai ? user.nama_pegawai.substring(0, 2).toUpperCase() : 'FN'}
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden leading-tight">
                                <p className="text-xs font-bold text-gray-900 truncate">{user.nama_pegawai}</p>
                                <p className="text-[10px] text-gray-500 truncate">{user.posisi_pegawai}</p>
                            </div>
                        )}
                    </div>
                    <Link href={route('profile.edit')}
                        className="relative flex items-center w-full gap-3 p-2.5 text-gray-500 rounded-xl hover:bg-yellow-50 hover:text-yellow-600 transition-all">
                        <div className="relative">
                            <StickyNote size={20} />
                            {user.note_pegawai && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white" />
                            )}
                        </div>
                        {isSidebarOpen && <span className="text-sm font-medium">Profile & Note</span>}
                    </Link>
                    <Link href={route('logout')} method="post" as="button"
                        className="flex items-center w-full gap-3 p-2.5 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="text-sm font-medium">Log Out</span>}
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>

                {/* TOP BAR */}
                <div className="sticky top-0 z-40 flex items-center justify-end px-8 py-3 bg-white border-b border-gray-100 shadow-sm">
                    {/* Bell Notifikasi */}
                    <div className="relative" ref={notifRef}>
                        <button onClick={handleOpenNotif}
                            className="relative flex items-center justify-center w-10 h-10 text-gray-500 transition-colors rounded-xl hover:bg-gray-100 hover:text-gray-800">
                            <Bell size={20} />
                            {unread > 0 && (
                                <span className="absolute flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-[#FF2D55] rounded-full -top-1 -right-1">
                                    {unread > 9 ? '9+' : unread}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Notifikasi */}
                        {showNotif && (
                            <div className="absolute right-0 overflow-hidden bg-white border border-gray-100 shadow-xl top-12 w-80 rounded-2xl">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-extrabold text-gray-800">Notifikasi</p>
                                        {unread > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-black text-white bg-[#FF2D55] rounded-full">
                                                {unread} baru
                                            </span>
                                        )}
                                    </div>
                                    {unread > 0 && (
                                        <button onClick={markAllRead}
                                            className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-green-500 transition-colors">
                                            <CheckCheck size={12} /> Tandai semua
                                        </button>
                                    )}
                                </div>

                                {/* List */}
                                <div className="overflow-y-auto divide-y max-h-80 divide-gray-50">
                                    {notifications.length > 0 ? notifications.map(notif => (
                                        <div key={notif.id}
                                            className={`flex items-start gap-3 px-4 py-3 transition-colors ${!notif.is_read ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 mt-0.5 bg-orange-100 rounded-full">
                                                <Upload size={15} className="text-[#FF2D55]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-extrabold text-gray-800">{notif.judul}</p>
                                                <p className="text-xs leading-relaxed text-gray-500 mt-0.5">{notif.pesan}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                                            </div>
                                            <button onClick={() => removeNotif(notif.id)}
                                                className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-red-400 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center text-gray-400">
                                            <Bell size={28} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold">Tidak ada notifikasi</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                                    <Link href={route('finance.bukti.index')}
                                        onClick={() => setShowNotif(false)}
                                        className="block text-xs font-bold text-center text-[#FF2D55] hover:underline">
                                        Lihat semua bukti pembayaran →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
