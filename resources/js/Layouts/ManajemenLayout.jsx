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
} from 'lucide-react';

export default function ManajemenLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
            name: 'Jadwal Acara',
            icon: Calendar,
            href: '/manajemen/jadwal-acara',
            active: currentPath.includes('jadwal-acara'),
        },
        {
            name: 'Events',
            icon: Calendar,
            href: route('manajemen.event.index'),
            active: currentPath.includes('event') && !currentPath.includes('client') && !currentPath.includes('evaluasi'),
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
        <div className="flex min-h-screen bg-gray-50">
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-50`}>

                {/* LOGO & TOGGLE */}
                <div className="flex items-center justify-between p-5 mb-4">
                    <div className="flex items-center justify-center flex-shrink-0 overflow-hidden bg-black rounded-full w-14 h-14">
                        <img
                            src="/images/LaksamanaLogo.png"
                            alt="Laksamana Muda"
                            className="object-contain w-12 h-12"
                        />
                    </div>
                    {isSidebarOpen && (
                        <span className="flex-1 ml-3 text-sm font-bold tracking-tight text-gray-800">
                            Laksamana Muda
                        </span>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                {/* MENU */}
                <nav className="flex-1 px-3 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                item.active
                                    ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon size={20} />
                            {isSidebarOpen && (
                                <span className="text-sm font-medium">{item.name}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* PROFILE & LOGOUT */}
                <div className="p-4 border-t border-gray-100">
                    <div className={`flex items-center gap-3 p-2 mb-2 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-[#FF5722]/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#FF5722]">
                            {user.nama_pegawai ? user.nama_pegawai.substring(0, 2).toUpperCase() : 'ST'}
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden leading-tight">
                                <p className="text-xs font-bold text-gray-900 truncate">{user.nama_pegawai}</p>
                                <p className="text-[10px] text-gray-500 truncate">{user.posisi_pegawai}</p>
                            </div>
                        )}
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center w-full gap-3 p-2.5 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="text-sm font-medium">Log Out</span>}
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

