import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { CheckCircle, Calendar, Layout, Bell, X, Trash2, Clock, CalendarCheck, RefreshCw, Ban, ClipboardList } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Dashboard({ auth, stats, aptStats, recentEvents, pendingAppointments, notifikasi: initialNotif, unread: initialUnread }) {
    const { auth: pageAuth } = usePage().props;
    const user = pageAuth.user;

    const [notifications, setNotifications] = useState(initialNotif || []);
    const [unread, setUnread] = useState(initialUnread || 0);
    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef(null);

    // Listen realtime via Pusher
    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;

        window.Echo.private('event-marketing')
            .listen('.appointment.created', (data) => {
                setNotifications(prev => [data, ...prev]);
                setUnread(prev => prev + 1);
            });

        return () => window.Echo.leave('event-marketing');
    }, []);

    // Tutup notif panel saat klik di luar
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
        setShowNotif(!showNotif);
    };

    const markAllRead = async () => {
        await axios.post('/notifikasi/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const removeNotif = async (id) => {
        await axios.delete('/notifikasi/' + id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getStatusColor = (status) => {
        if (status === 'Done') return 'bg-green-100 text-green-700';
        if (status === 'Upcoming') return 'bg-orange-100 text-orange-600';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <EventMarketingLayout>
            <Head title="Event Marketing Dashboard" />

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
                    <p className="font-medium text-gray-500">
                        Selamat Datang, <span className="text-[#FF2D55] font-bold">{user.nama_pegawai}</span>!
                    </p>
                </div>

                {/* Bell Notifikasi */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={handleOpenNotif}
                        className="relative p-2.5 bg-white border border-gray-100 shadow-sm rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <Bell size={20} className="text-gray-600" />
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-black text-white bg-[#FF2D55] rounded-full animate-pulse">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 z-50 overflow-hidden bg-white border border-gray-100 shadow-xl top-12 w-80 rounded-2xl">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-extrabold text-gray-800">Notifikasi</p>
                                    {unread > 0 && (
                                        <span className="px-1.5 py-0.5 text-xs font-black text-white bg-[#FF2D55] rounded-full">
                                            {unread}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {unread > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs font-bold text-[#FF2D55] hover:underline"
                                        >
                                            Tandai semua dibaca
                                        </button>
                                    )}
                                    <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto divide-y max-h-96 divide-gray-50">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} className={'flex items-start gap-3 px-4 py-3 transition-colors ' + (!notif.is_read ? 'bg-red-50/60' : 'hover:bg-gray-50')}>
                                        <div className={'flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-full mt-0.5 ' + (notif.tipe === 'appointment' ? 'bg-red-100' : 'bg-orange-100')}>
                                            <Calendar size={15} className={'text-[#FF2D55]'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-extrabold text-gray-800">{notif.judul}</p>
                                            <p className="text-xs leading-relaxed text-gray-500">{notif.pesan}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                                        </div>
                                        <button
                                            onClick={() => removeNotif(notif.id)}
                                            className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors mt-0.5"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center text-gray-400">
                                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold">Belum ada notifikasi</p>
                                    </div>
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                                    <p className="text-xs text-center text-gray-400">{notifications.length} notifikasi tersimpan</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 mb-10 md:grid-cols-3">
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50">
                            <Layout size={22} className="text-[#FF2D55]" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-900">{stats.totalEvent}</p>
                            <p className="text-xs font-semibold text-gray-400">Total Event</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50">
                            <Calendar size={22} className="text-orange-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-900">{stats.eventActive}</p>
                            <p className="text-xs font-semibold text-gray-400">Event Active</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50">
                            <CheckCircle size={22} className="text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-900">{stats.eventDone}</p>
                            <p className="text-xs font-semibold text-gray-400">Event Done</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Appointment Stats */}
            {aptStats && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-extrabold text-gray-800">Statistik Appointment</h2>
                        <Link href={route('em.appointment.index')} className="text-xs font-bold text-[#FF2D55] hover:underline">
                            Lihat Semua →
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

                        {/* Total */}
                        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0">
                                <ClipboardList size={18} className="text-gray-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptTotal}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Total</p>
                            </div>
                        </div>

                        {/* Bulan Ini */}
                        <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 flex-shrink-0">
                                <Calendar size={18} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptBulanIni}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Bulan Ini</p>
                            </div>
                        </div>

                        {/* Pending */}
                        <Link href={route('em.appointment.index') + '?status=Pending'}
                            className="p-4 bg-white border border-red-100 shadow-sm rounded-2xl flex items-center gap-3 hover:border-red-300 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 flex-shrink-0 relative">
                                <Clock size={18} className="text-[#FF2D55]" />
                                {aptStats.aptPending > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-black text-white bg-[#FF2D55] rounded-full flex items-center justify-center animate-pulse">
                                        {aptStats.aptPending > 9 ? '9+' : aptStats.aptPending}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptPending}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Pending</p>
                            </div>
                        </Link>

                        {/* Dikonfirmasi */}
                        <Link href={route('em.appointment.index') + '?status=Dikonfirmasi'}
                            className="p-4 bg-white border border-green-100 shadow-sm rounded-2xl flex items-center gap-3 hover:border-green-300 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 flex-shrink-0">
                                <CalendarCheck size={18} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptDikonfirmasi}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Dikonfirmasi</p>
                            </div>
                        </Link>

                        {/* Reschedule */}
                        <Link href={route('em.appointment.index') + '?status=Reschedule'}
                            className="p-4 bg-white border border-yellow-100 shadow-sm rounded-2xl flex items-center gap-3 hover:border-yellow-300 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-50 flex-shrink-0">
                                <RefreshCw size={18} className="text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptReschedule}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Reschedule</p>
                            </div>
                        </Link>

                        {/* Selesai */}
                        <Link href={route('em.appointment.index') + '?status=Selesai'}
                            className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center gap-3 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 flex-shrink-0">
                                <CheckCircle size={18} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptSelesai}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Selesai</p>
                            </div>
                        </Link>

                        {/* Dibatalkan */}
                        <Link href={route('em.appointment.index') + '?status=Dibatalkan'}
                            className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center gap-3 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0">
                                <Ban size={18} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{aptStats.aptDibatalkan}</p>
                                <p className="text-[11px] font-semibold text-gray-400 leading-tight">Dibatalkan</p>
                            </div>
                        </Link>

                    </div>
                </div>
            )}

            {/* Pending Appointments */}
            {pendingAppointments && pendingAppointments.length > 0 && (
                <div className="p-6 mb-6 bg-white border border-red-100 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold text-gray-900">Appointment Menunggu Konfirmasi</h3>
                            <span className="flex items-center justify-center px-2 py-0.5 text-xs font-black text-white bg-[#FF2D55] rounded-full animate-pulse">
                                {pendingAppointments.length}
                            </span>
                        </div>
                        <Link
                            href={route('em.appointment.index') + '?status=Pending'}
                            className="text-xs font-bold text-[#FF2D55] hover:underline"
                        >
                            Lihat Semua →
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {pendingAppointments.map(apt => (
                            <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-100">
                                <div className="min-w-0 flex-1 mr-3">
                                    <p className="text-sm font-bold text-gray-800 truncate">{apt.jenis_event}</p>
                                    <p className="text-xs text-gray-400">
                                        {apt.client?.nama_client} · {formatTanggal(apt.tgl_request)}{apt.jam_request ? ' · ' + apt.jam_request : ''}
                                    </p>
                                </div>
                                <Link
                                    href={route('em.appointment.show', apt.id)}
                                    className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-white bg-[#FF2D55] rounded-lg hover:bg-[#e02249] transition-colors"
                                >
                                    Konfirmasi
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Events */}
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <h3 className="mb-4 text-lg font-extrabold text-gray-900">Recent Events</h3>
                {recentEvents.length > 0 ? (
                    <div className="space-y-3">
                        {recentEvents.map(event => (
                            <Link key={event.id_event}
                                href={`${route('em.event.index')}?open=${event.id_event}`}
                                className="flex items-center gap-3 p-3 transition-colors rounded-xl bg-gray-50 hover:bg-gray-100">
                                {/* Poster mini */}
                                {event.poster_event ? (
                                    <img src={`/${event.poster_event}`} alt={event.nama_event}
                                        className="flex-shrink-0 object-cover w-10 h-10 rounded-lg" />
                                ) : (
                                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF2D55]/20 to-gray-200 text-[10px] font-black text-gray-500">
                                        {event.nama_event.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{event.nama_event}</p>
                                    <p className="text-xs text-gray-400">{formatTanggal(event.tgl_mulai_event)}</p>
                                </div>
                                <span className={'px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ' + getStatusColor(event.status_event)}>
                                    {event.status_event}
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Belum ada event.</p>
                )}
            </div>
        </EventMarketingLayout>
    );
}

