import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    LogOut,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Star,
    CalendarCheck,
    ClipboardList,
    Menu,
    X,
} from 'lucide-react';

export default function ManajemenLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const currentPath = window.location.pathname;

    const getDashboardHref = () => {
        if (user.posisi_pegawai === 'Manajemen') return route('manajemen.dashboard');
        if (user.posisi_pegawai === 'EventMarketing') return route('event.dashboard');
        if (user.posisi_pegawai === 'Finance') return route('finance.dashboard');
        return '/';
    };

    const menuItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            href: getDashboardHref(),
            active: currentPath.includes('dashboard'),
        },
        {
            name: 'Kalender',
            icon: Calendar,
            href: '/manajemen/jadwal-acara',
            active: currentPath.includes('jadwal-acara'),
        },
        {
            name: 'Events',
            icon: Calendar,
            href: route('manajemen.event.index'),
            active: currentPath.includes('/manajemen/event'),
        },
        {
            name: 'Planning Event',
            icon: ClipboardList,
            href: route('manajemen.planning.index'),
            active: currentPath.includes('/manajemen/planning'),
        },
        {
            name: 'Client',
            icon: Users,
            href: route('manajemen.client.index'),
            active: currentPath.includes('client'),
        },
        {
            name: 'Transaksi',
            icon: CreditCard,
            href: route('manajemen.transaksi.index'),
            active: currentPath.includes('transaksi'),
        },
        {
            name: 'Appointment',
            icon: CalendarCheck,
            href: route('manajemen.appointment.index'),
            active: currentPath.includes('/manajemen/appointment'),
        },
        {
            name: 'Evaluasi Kinerja',
            icon: Star,
            href: route('manajemen.evaluasi.index'),
            active: currentPath.includes('evaluasi') && !currentPath.startsWith('/manajemen/pegawai'),
        },
        {
            name: 'Manajemen Pegawai',
            icon: Users,
            href: route('manajemen.pegawai.index'),
            active: currentPath === '/manajemen/pegawai' || currentPath.startsWith('/manajemen/pegawai/'),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">

            {/* TOP BAR (mobile only) */}
            <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 lg:hidden">
                <button onClick={() => setMobileOpen(true)}
                    className="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100">
                    <Menu size={22} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-black rounded-full">
                        <img src="/images/LaksamanaLogo.png" alt="Laksamana Muda" className="object-contain w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">Laksamana Muda</span>
                </div>
            </div>

            {/* BACKDROP (mobile, saat drawer terbuka) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}>

                {/* LOGO & TOGGLE */}
                <div className="flex items-center justify-between p-5 mb-4">
                    <div className="flex items-center justify-center flex-shrink-0 overflow-hidden bg-black rounded-full w-14 h-14">
                        <img
                            src="/images/LaksamanaLogo.png"
                            alt="Laksamana Muda"
                            className="object-contain w-12 h-12"
                        />
                    </div>
                    <span className={`flex-1 ml-3 text-sm font-bold tracking-tight text-gray-800 ${isSidebarOpen ? '' : 'lg:hidden'}`}>
                        Laksamana Muda
                    </span>
                    {/* Toggle collapse — desktop */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:block"
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                    {/* Tutup drawer — mobile */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* MENU */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                item.active
                                    ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon size={20} className="flex-shrink-0" />
                            <span className={`text-sm font-medium ${isSidebarOpen ? '' : 'lg:hidden'}`}>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                {/* PROFILE & LOGOUT */}
                <div className="p-4 border-t border-gray-100">
                    <div className={`flex items-center gap-3 p-2 mb-2 ${!isSidebarOpen && 'lg:justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-[#FF5722]/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#FF5722]">
                            {user.nama_pegawai ? user.nama_pegawai.substring(0, 2).toUpperCase() : 'ST'}
                        </div>
                        <div className={`overflow-hidden leading-tight ${isSidebarOpen ? '' : 'lg:hidden'}`}>
                            <p className="text-xs font-bold text-gray-900 truncate">{user.nama_pegawai}</p>
                            <p className="text-[10px] text-gray-500 truncate">{user.posisi_pegawai}</p>
                        </div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center w-full gap-3 p-2.5 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        <span className={`text-sm font-medium ${isSidebarOpen ? '' : 'lg:hidden'}`}>Log Out</span>
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

