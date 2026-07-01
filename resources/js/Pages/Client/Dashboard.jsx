import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import RupiahInput from '@/Components/RupiahInput';
import {
    Plus, Calendar, Clock, CheckCircle, XCircle,
    AlertCircle, LogOut, Home, Upload, FileText,
    ChevronDown, ChevronUp, X, Eye, Bell, Trash2, CheckCheck,
    User, Timer
} from 'lucide-react';

export default function ClientDashboard({ appointments, events, totalAppointments, totalEvents }) {
    const { auth, flash } = usePage().props;

    // ── NOTIFIKASI ──────────────────────────────────────────
    const [notifs, setNotifs]             = useState([]);
    const [unread, setUnread]             = useState(0);
    const [showNotif, setShowNotif]       = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const notifRef                      = useRef(null);
    const userMenuRef                   = useRef(null);

    const fetchNotif = async () => {
        try {
            const res = await axios.get('/notifikasi');
            setNotifs(res.data.notifikasi);
            setUnread(res.data.unread);
        } catch {}
    };

    useEffect(() => {
        fetchNotif();
        // Polling notifikasi setiap 30 detik
        const pollInterval = setInterval(fetchNotif, 30000);
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('mousedown', handler);
        };
    }, []);

    const markAllRead = async () => {
        await axios.post('/notifikasi/read-all');
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const removeNotif = async (id) => {
        await axios.delete(`/notifikasi/${id}`);
        setNotifs(prev => prev.filter(n => n.id !== id));
    };

    const formatNotifTime = (tgl) => {
        if (!tgl) return '';
        const d = new Date(tgl);
        const diffM = Math.floor((new Date() - d) / 60000);
        if (diffM < 1)    return 'Baru saja';
        if (diffM < 60)   return `${diffM} menit lalu`;
        if (diffM < 1440) return `${Math.floor(diffM / 60)} jam lalu`;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    const getNotifIcon = (tipe) => {
        if (tipe === 'bukti_pembayaran') return '💳';
        return '📅';
    };
    // ── SEMUA HOOKS HARUS DI ATAS — sebelum return kondisional apapun ──
    const [activeTab, setActiveTab]         = useState('appointments');
    const [aptFilter, setAptFilter]         = useState('Semua');
    const [aptSearch, setAptSearch]         = useState('');
    const [expandedEvent, setExpandedEvent] = useState(null);
    const [uploadModal, setUploadModal]     = useState(null);
    const [cancelModal, setCancelModal]     = useState(null);
    const [alasanBatal, setAlasanBatal]     = useState('');
    const [deleteBuktiId, setDeleteBuktiId] = useState(null);
    const [deletingBukti, setDeletingBukti] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        id_event: '',
        file_bukti: null,
        nominal: '',
        keterangan: '',
    });

    const user = auth?.user;
    const BASE_URL = window.location.origin;

    // Redirect jika tidak ada user (fallback — middleware harusnya sudah handle)
    useEffect(() => {
        if (!user) window.location.href = route('client.login');
    }, [user]);

    if (!user) return null;

    // Status untuk Appointment
    const getStatusColor = (status) => {
        if (status === 'Dikonfirmasi') return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (status === 'Pending')      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
        if (status === 'Reschedule')   return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (status === 'Selesai')      return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        if (status === 'Dibatalkan')   return 'bg-red-500/10 text-red-400 border-red-500/30';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    };

    // Status untuk Event
    const getEventStatusColor = (status) => {
        if (status === 'Upcoming')    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        if (status === 'Done')      return 'bg-green-500/20 text-green-300 border-green-500/30';
        if (status === 'Pending')   return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        if (status === 'Cancelled') return 'bg-red-500/20 text-red-300 border-red-500/30';
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    };

    const getEventStatusLabel = (status) => {
        if (status === 'Upcoming')    return 'Upcoming';
        if (status === 'Done')      return 'Selesai';
        if (status === 'Pending')   return 'Pending';
        if (status === 'Cancelled') return 'Dibatalkan';
        return status || '-';
    };

    const getAptStatusLabel = (status) => {
        if (status === 'Dibatalkan') return 'Dibatalkan';
        return status;
    };

    const getBuktiStatusColor = (status) => {
        if (status === 'Diverifikasi') return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (status === 'Menunggu') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
        if (status === 'Ditolak') return 'bg-red-500/10 text-red-400 border-red-500/30';
        return '';
    };

    const getStatusIcon = (status) => {
        if (status === 'Dikonfirmasi') return <CheckCircle size={14} />;
        if (status === 'Pending') return <Clock size={14} />;
        if (status === 'Dibatalkan') return <XCircle size={14} />;
        return <AlertCircle size={14} />;
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatBudget = (value) => {
        if (!value) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(value);
    };

    const handleCancel = (apt) => {
        setCancelModal(apt);
        setAlasanBatal('');
    };

    const submitCancel = () => {
        if (cancelLoading) return;
        setCancelLoading(true);
        router.delete(route('client.appointment.destroy', cancelModal.id), {
            data: { alasan: alasanBatal },
            onSuccess: () => { setCancelModal(null); setAlasanBatal(''); },
            onFinish: () => setCancelLoading(false),
        });
    };

    const openUpload = (event) => {
        reset();
        setData({ id_event: event.id_event, file_bukti: null, nominal: '', keterangan: '' });
        setUploadModal(event);
    };

    const handleUpload = (e) => {
        e.preventDefault();
        post(route('client.bukti.upload'), {
            forceFormData: true,
            onSuccess: () => {
                setUploadModal(null);
                reset();
            },
        });
    };


    const handleDeleteBukti = (id) => {
        setDeleteBuktiId(id);
    };

    const confirmDeleteBukti = () => {
        if (deletingBukti) return;
        setDeletingBukti(true);
        router.delete(route('client.bukti.delete', deleteBuktiId), {
            onFinish: () => { setDeleteBuktiId(null); setDeletingBukti(false); },
        });
    };

    // ── TIMELINE HELPER ─────────────────────────────────────
    const getTimelineSteps = (apt) => {
        const isDone      = apt.status === 'Selesai';
        const isCancelled = apt.status === 'Dibatalkan';
        const hasMeeting  = ['Dikonfirmasi', 'Reschedule', 'Selesai'].includes(apt.status);

        return [
            { label: 'Diajukan',  done: true,         cancelled: false },
            { label: 'Meeting',   done: hasMeeting,   cancelled: isCancelled && !hasMeeting },
            { label: 'Selesai',   done: isDone,        cancelled: isCancelled },
        ];
    };

    // ── COUNTDOWN HELPER ─────────────────────────────────────
    const getDaysUntil = (tgl) => {
        if (!tgl) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(tgl);
        eventDate.setHours(0, 0, 0, 0);
        return Math.ceil((eventDate - today) / 86400000);
    };

    return (
        <>
            <Head title="Dashboard - Laksamana Muda" />
            <div className="min-h-screen bg-black">

                {/* Navbar */}
                <nav className="sticky top-0 z-40 px-6 py-3 bg-gray-900/95 backdrop-blur-md border-b border-yellow-500/20">
                    <div className="flex items-center justify-between max-w-6xl mx-auto">

                        {/* ── Left: Brand ── */}
                        <a href={BASE_URL} className="flex items-center gap-2.5 group">
                            <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-black border border-yellow-500 rounded-full transition-transform group-hover:scale-110">
                                <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white leading-none">
                                    Laksamana <span className="text-yellow-500">Muda</span>
                                </span>
                                <p className="text-[10px] text-gray-600 leading-none mt-0.5">Dashboard Client</p>
                            </div>
                        </a>

                        {/* ── Right: Actions ── */}
                        <div className="flex items-center gap-2">

                            {/* Home link */}
                            <a href={BASE_URL}
                                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                                title="Beranda">
                                <Home size={17} />
                            </a>

                            {/* Bell Notifikasi */}
                            <div className="relative" ref={notifRef}>
                                <button onClick={() => { setShowNotif(p => !p); if (!showNotif) fetchNotif(); }}
                                    className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                                    <Bell size={17} />
                                    {unread > 0 && (
                                        <span className="absolute flex items-center justify-center w-4 h-4 text-[9px] font-black text-black bg-yellow-400 rounded-full -top-0.5 -right-0.5">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                </button>

                                {showNotif && (
                                    <div className="absolute right-0 z-50 overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl top-10 w-80 rounded-2xl">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-extrabold text-white">Notifikasi</p>
                                                {unread > 0 && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-black text-black bg-yellow-400 rounded-full">
                                                        {unread} baru
                                                    </span>
                                                )}
                                            </div>
                                            {unread > 0 && (
                                                <button onClick={markAllRead}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-yellow-400 transition-colors">
                                                    <CheckCheck size={11} /> Baca semua
                                                </button>
                                            )}
                                        </div>

                                        <div className="overflow-y-auto divide-y divide-gray-800 max-h-72">
                                            {notifs.length > 0 ? notifs.map(n => (
                                                <div key={n.id}
                                                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? 'bg-yellow-500/5' : 'hover:bg-gray-800/50'}`}>
                                                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mt-0.5 bg-gray-800 rounded-full text-base">
                                                        {getNotifIcon(n.tipe)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-extrabold text-white">{n.judul}</p>
                                                        <p className="mt-0.5 text-xs leading-relaxed text-gray-400 line-clamp-2">{n.pesan}</p>
                                                        <p className="mt-1 text-[10px] text-gray-600">{formatNotifTime(n.created_at)}</p>
                                                    </div>
                                                    <button onClick={() => removeNotif(n.id)}
                                                        className="flex-shrink-0 mt-0.5 text-gray-600 hover:text-red-400 transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )) : (
                                                <div className="py-10 text-center text-gray-600">
                                                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm font-bold">Tidak ada notifikasi</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Avatar dropdown */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen(p => !p)}
                                    className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-all ${
                                        userMenuOpen
                                            ? 'bg-yellow-500/15 border-yellow-500/50'
                                            : 'bg-gray-800 border-gray-700 hover:border-yellow-500/40 hover:bg-yellow-500/10'
                                    }`}>
                                    <div className="flex items-center justify-center w-6 h-6 text-[11px] font-black text-black bg-yellow-500 rounded-lg flex-shrink-0">
                                        {user?.nama_client?.substring(0, 1).toUpperCase() ?? 'C'}
                                    </div>
                                    <span className="hidden sm:block text-xs font-bold text-gray-200 max-w-[80px] truncate">
                                        {user?.nama_client?.split(' ')[0] ?? 'Client'}
                                    </span>
                                    <ChevronDown size={13} className={`text-gray-500 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-11 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                                        {/* User info header */}
                                        <div className="px-4 py-3 border-b border-gray-800">
                                            <p className="text-xs font-bold text-white truncate">{user?.nama_client}</p>
                                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{user?.email_client}</p>
                                        </div>

                                        {/* Menu items */}
                                        <div className="py-1">
                                            <Link href={route('client.profile')}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors">
                                                <User size={14} className="flex-shrink-0" />
                                                Profil Saya
                                            </Link>
                                            <Link href={route('client.appointment.create')}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors">
                                                <Calendar size={14} className="flex-shrink-0" />
                                                Buat Appointment
                                            </Link>
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-gray-800 py-1">
                                            <Link href={route('client.logout')} method="post" as="button"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                                <LogOut size={14} className="flex-shrink-0" />
                                                Keluar
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </nav>

                <div className="max-w-6xl px-6 py-10 mx-auto">
                    {/* Header */}
                    <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-white sm:text-3xl">
                                Halo, <span className="text-yellow-500">{user?.nama_client?.split(' ')[0] || user?.email_client?.split('@')[0] || 'Client'}</span>! 👋
                            </h1>
                            <p className="mt-1 text-sm text-gray-400">Kelola appointment dan event Anda di sini.</p>
                        </div>
                        <Link href={route('client.appointment.create')}
                            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 transition-all text-sm">
                            <Plus size={16} strokeWidth={3} />
                            Buat Appointment
                        </Link>
                    </div>

                    {/* Flash */}
                    {flash?.success && (
                        <div className="p-4 mb-6 font-bold text-yellow-400 border bg-yellow-500/10 border-yellow-500/30 rounded-xl">
                            ✅ {flash.success}
                        </div>
                    )}

                    {/* Banner: lengkapi profil (perusahaan / no HP belum diisi — mis. akun Google) */}
                    {(!user?.no_telp_client || !user?.perusahaan_client) && (
                        <div className="flex items-center justify-between gap-4 p-4 mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl flex-shrink-0">📋</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-blue-300">Lengkapi profil Anda</p>
                                    <p className="text-xs text-blue-400/70 mt-0.5 leading-relaxed">
                                        {!user?.perusahaan_client && !user?.no_telp_client
                                            ? 'Nama perusahaan & nomor HP belum diisi — wajib untuk membuat appointment.'
                                            : !user?.perusahaan_client
                                                ? 'Nama perusahaan belum diisi — wajib untuk membuat appointment.'
                                                : 'Nomor HP belum diisi — diperlukan agar tim kami bisa menghubungi Anda.'}
                                    </p>
                                </div>
                            </div>
                            <Link href={route('client.profile')}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-blue-300 border border-blue-500/40 rounded-lg hover:bg-blue-500/15 transition-colors whitespace-nowrap">
                                Isi Sekarang →
                            </Link>
                        </div>
                    )}

                    {/* ── STAT SUMMARY CARDS (sekaligus tab selector) ── */}
                    {(() => {
                        const aptAktif = appointments.filter(a =>
                            ['Pending', 'Dikonfirmasi', 'Reschedule'].includes(a.status)
                        ).length;

                        const evList       = events || [];
                        const eventAktif   = evList.filter(e => e.status_event === 'Upcoming').length;
                        const eventSelesai = evList.filter(e => e.status_event === 'Done').length;

                        const eventBelumLunas = evList.filter(event => {
                            if (!event.deal_harga_event) return false;
                            const dibayar = (event.bukti_pembayaran || [])
                                .filter(b => b.status === 'Diverifikasi')
                                .reduce((s, b) => s + (Number(b.nominal) || 0), 0);
                            return dibayar < event.deal_harga_event;
                        }).length;

                        const cards = [
                            {
                                id:      'appointments',
                                icon:    '📋',
                                value:   totalAppointments ?? appointments.length,
                                label:   'Appointment',
                                badge:   aptAktif > 0
                                    ? { text: `${aptAktif} aktif`, cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
                                    : null,
                                sub:     aptAktif === 0 ? 'Tidak ada yang aktif' : null,
                            },
                            {
                                id:      'events',
                                icon:    '🎪',
                                value:   totalEvents ?? evList.length,
                                label:   'Event Saya',
                                badge:   eventAktif > 0
                                    ? { text: `${eventAktif} upcoming`, cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
                                    : eventSelesai > 0
                                        ? { text: `${eventSelesai} selesai`, cls: 'bg-green-500/20 text-green-400 border-green-500/30' }
                                        : null,
                                sub:     evList.length === 0 ? 'Belum ada event' : null,
                            },
                            {
                                id:      'payments',
                                icon:    '💳',
                                value:   eventBelumLunas > 0 ? eventBelumLunas : '✓',
                                label:   'Pembayaran',
                                badge:   null,
                                sub:     eventBelumLunas > 0 ? 'event belum lunas' : 'Semua lunas',
                                accent:  eventBelumLunas > 0 ? 'orange' : 'green',
                            },
                        ];

                        return (
                            <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
                                {cards.map((card, i) => {
                                    const effectiveTab = card.id;
                                    const isActive = activeTab === card.id;
                                    const accentMap = {
                                        orange: 'bg-orange-500/10 border-orange-500/40 hover:shadow-orange-500/10',
                                        green:  'bg-green-500/10 border-green-500/30 hover:shadow-green-500/10',
                                    };
                                    const valueCls = card.accent === 'orange'
                                        ? 'text-orange-400'
                                        : card.accent === 'green'
                                            ? 'text-green-400'
                                            : 'text-white';

                                    return (
                                        <button key={i}
                                            onClick={() => setActiveTab(effectiveTab)}
                                            className={`p-5 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                                card.accent
                                                    ? accentMap[card.accent]
                                                    : isActive
                                                        ? 'bg-yellow-500/15 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                                        : 'bg-gray-900 border-gray-800 hover:border-yellow-500/30'
                                            } ${isActive ? 'ring-2 ring-yellow-500/40' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-2xl leading-none">{card.icon}</span>
                                                {card.badge && (
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${card.badge.cls}`}>
                                                        {card.badge.text}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-3xl font-black leading-none mb-1 ${valueCls}`}>
                                                {card.value}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {card.label}
                                                {card.sub && <span className="ml-1 text-gray-600">— {card.sub}</span>}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* TAB: APPOINTMENTS */}
                    {activeTab === 'appointments' && (
                        <div className="space-y-4">

                            {/* Search bar */}
                            {appointments.length > 0 && (
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
                                    <input
                                        type="text"
                                        placeholder="Cari jenis event..."
                                        value={aptSearch}
                                        onChange={e => setAptSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-900 border border-gray-800 rounded-xl text-gray-300 placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none transition-colors"
                                    />
                                    {aptSearch && (
                                        <button onClick={() => setAptSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Filter status pills */}
                            {appointments.length > 0 && (() => {
                                const counts = appointments.reduce((acc, a) => {
                                    acc[a.status] = (acc[a.status] || 0) + 1;
                                    return acc;
                                }, {});
                                const pills = [
                                    { key: 'Semua', label: 'Semua', count: appointments.length },
                                    ...['Pending','Dikonfirmasi','Reschedule','Selesai','Dibatalkan']
                                        .filter(s => counts[s] > 0)
                                        .map(s => ({ key: s, label: getAptStatusLabel(s), count: counts[s] })),
                                ];
                                return pills.length > 1 ? (
                                    <div className="flex flex-wrap gap-2 pb-2">
                                        {pills.map(p => (
                                            <button key={p.key} onClick={() => setAptFilter(p.key)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                                    aptFilter === p.key
                                                        ? 'bg-yellow-500 text-black border-yellow-500'
                                                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-yellow-500/40 hover:text-yellow-400'
                                                }`}>
                                                {p.label}
                                                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                                    aptFilter === p.key ? 'bg-black/20 text-black' : 'bg-gray-700 text-gray-400'
                                                }`}>{p.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null;
                            })()}

                            {/* List */}
                            {(() => {
                                const q = aptSearch.toLowerCase();
                                const filtered = appointments
                                    .filter(a => aptFilter === 'Semua' || a.status === aptFilter)
                                    .filter(a => !q ||
                                        a.jenis_event?.toLowerCase().includes(q) ||
                                        a.deskripsi_event?.toLowerCase().includes(q));
                                return filtered.length > 0 ? filtered.map(apt => (
                                <div key={apt.id} className="p-6 transition-colors bg-gray-900 border border-gray-800 rounded-2xl hover:border-yellow-500/30">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                <h3 className="text-base font-black text-white sm:text-lg">{apt.jenis_event}</h3>
                                                <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(apt.status)}`}>
                                                    {getStatusIcon(apt.status)}
                                                    {getAptStatusLabel(apt.status)}
                                                </span>
                                            </div>
                                            {/* Timeline Status */}
                                            <div className="flex items-center gap-1 mb-4">
                                                {getTimelineSteps(apt).map((step, i, arr) => (
                                                    <div key={i} className="flex items-center gap-1">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                                                                step.cancelled
                                                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                                                    : step.done
                                                                        ? 'bg-yellow-500 border-yellow-500 text-black'
                                                                        : 'bg-gray-800 border-gray-600 text-gray-600'
                                                            }`}>
                                                                {step.cancelled ? '✕' : step.done ? '✓' : i + 1}
                                                            </div>
                                                            <span className={`text-[9px] font-bold whitespace-nowrap ${
                                                                step.cancelled ? 'text-red-400' : step.done ? 'text-yellow-400' : 'text-gray-600'
                                                            }`}>{step.label}</span>
                                                        </div>
                                                        {i < arr.length - 1 && (
                                                            <div className={`h-px w-8 mb-3.5 ${step.done && !arr[i+1]?.cancelled ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-3 md:grid-cols-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tanggal Request</p>
                                                    <p className="text-sm font-bold text-gray-300">{formatTanggal(apt.tgl_request)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Jam</p>
                                                    <p className="text-sm font-bold text-gray-300">{apt.jam_request || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Jumlah Tamu</p>
                                                    <p className="text-sm font-bold text-gray-300">{apt.jumlah_tamu ? apt.jumlah_tamu + ' orang' : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Est. Budget</p>
                                                    <p className="text-sm font-bold text-gray-300">{formatBudget(apt.estimasi_budget)}</p>
                                                </div>
                                            </div>
                                            {apt.deskripsi_event && <p className="mb-3 text-sm text-gray-500">{apt.deskripsi_event}</p>}
                                            {apt.status === 'Dikonfirmasi' && apt.tgl_konfirmasi && (
                                                <div className="p-3 border bg-green-500/10 border-green-500/20 rounded-xl">
                                                    <p className="mb-1 text-xs font-bold text-green-400">✅ Meeting Dikonfirmasi</p>
                                                    <p className="text-sm text-green-300">{formatTanggal(apt.tgl_konfirmasi)} {apt.jam_konfirmasi && `pukul ${apt.jam_konfirmasi}`}</p>
                                                    {apt.pegawai && (
                                                        <p className="mt-1 text-xs text-green-500/70">
                                                            👤 Dikonfirmasi oleh: <span className="font-bold text-green-400">{apt.pegawai.nama_pegawai}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {apt.status === 'Reschedule' && apt.tgl_konfirmasi && (
                                                <div className="p-3 border bg-blue-500/10 border-blue-500/20 rounded-xl">
                                                    <p className="mb-1 text-xs font-bold text-blue-400">🔄 Jadwal Diubah</p>
                                                    <p className="text-sm text-blue-300">{formatTanggal(apt.tgl_konfirmasi)} {apt.jam_konfirmasi && `pukul ${apt.jam_konfirmasi}`}</p>
                                                    {apt.pegawai && (
                                                        <p className="mt-1 text-xs text-blue-500/70">
                                                            👤 Di-reschedule oleh: <span className="font-bold text-blue-400">{apt.pegawai.nama_pegawai}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {apt.catatan_em && (
                                                <div className="p-3 mt-3 bg-gray-800 rounded-xl">
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Catatan dari Tim</p>
                                                    <p className="text-sm text-gray-300">{apt.catatan_em}</p>
                                                </div>
                                            )}
                                            {apt.status === 'Dibatalkan' && apt.alasan_batal_client && (
                                                <div className="p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Alasan Pembatalan (dari kamu)</p>
                                                    <p className="text-sm text-red-300">{apt.alasan_batal_client}</p>
                                                </div>
                                            )}
                                        </div>
                                        {['Pending', 'Dikonfirmasi', 'Reschedule'].includes(apt.status) && (
                                            <button onClick={() => handleCancel(apt)}
                                                className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0">
                                                Batalkan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                // Filter ada hasil tapi kosong
                                <div className="py-12 text-center border border-gray-800 border-dashed rounded-2xl">
                                    <p className="font-bold text-gray-500">Tidak ada appointment berstatus <span className="text-yellow-500">"{aptFilter}"</span>.</p>
                                    <button onClick={() => setAptFilter('Semua')}
                                        className="mt-3 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
                                        Lihat semua →
                                    </button>
                                </div>
                            );
                            })()}

                            {/* Empty state: belum ada appointment sama sekali */}
                            {appointments.length === 0 && (
                                <div className="py-20 text-center border-2 border-gray-800 border-dashed rounded-3xl">
                                    <Calendar size={48} className="mx-auto mb-4 text-gray-700" />
                                    <p className="text-lg font-bold text-gray-500">Belum ada appointment</p>
                                    <p className="mt-1 mb-6 text-sm text-gray-600">Buat appointment untuk diskusi event Anda bersama tim kami.</p>
                                    <Link href={route('client.appointment.create')}
                                        className="inline-flex items-center gap-2 px-6 py-3 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400">
                                        <Plus size={18} />
                                        Buat Appointment Pertama
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: EVENTS */}
                    {activeTab === 'events' && (
                        <div>
                            {events && events.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.map(event => {
                                        const dibayar = (event.bukti_pembayaran || [])
                                            .filter(b => b.status === 'Diverifikasi')
                                            .reduce((sum, b) => sum + (Number(b.nominal) || 0), 0);
                                        const dealHarga = Number(event.deal_harga_event) || 0;
                                        const pct   = dealHarga > 0 ? Math.min(100, Math.round((dibayar / dealHarga) * 100)) : 0;
                                        const lunas = dealHarga > 0 && dibayar >= dealHarga;
                                        const sisa  = dealHarga - dibayar;
                                        const isExpanded = expandedEvent === event.id_event;
                                        const days  = getDaysUntil(event.tgl_mulai_event);

                                        return (
                                        <Fragment key={event.id_event}>

                                        {/* ── Card ── */}
                                        <div className="flex flex-col overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl hover:border-yellow-500/30 transition-colors">

                                            {/* Poster */}
                                            <div className="relative h-36 overflow-hidden flex-shrink-0">
                                                {event.poster_event ? (
                                                    <img src={`/${event.poster_event}`} alt={event.nama_event}
                                                        className="object-cover w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 via-gray-800 to-gray-900 flex items-center justify-center">
                                                        <span className="text-4xl font-black text-yellow-500/20 select-none">
                                                            {event.nama_event.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />

                                                {/* Status badge */}
                                                <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border backdrop-blur-sm ${getEventStatusColor(event.status_event)}`}>
                                                        {getEventStatusLabel(event.status_event)}
                                                    </span>
                                                    {event.status_event === 'Upcoming' && days !== null && days >= 0 && (
                                                        days === 0
                                                            ? <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500/90 text-white backdrop-blur-sm animate-pulse">🎉 Hari ini!</span>
                                                            : days <= 7
                                                                ? <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500/90 text-white backdrop-blur-sm"><Timer size={9} />{days}h lagi</span>
                                                                : days <= 30
                                                                    ? <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/90 text-black backdrop-blur-sm"><Timer size={9} />{days}h lagi</span>
                                                                    : null
                                                    )}
                                                </div>

                                                {/* Event name */}
                                                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                                                    <p className="text-sm font-black text-white leading-tight line-clamp-2 drop-shadow">{event.nama_event}</p>
                                                    {event.kategori_event && (
                                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-yellow-500/90 text-black rounded-full">
                                                            {event.kategori_event}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="flex flex-col flex-1 p-3 gap-2.5">

                                                {/* Quick info — 2 kolom, 2 baris */}
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
                                                        <span className="flex-shrink-0">📅</span>
                                                        <span className="font-medium truncate">{formatTanggal(event.tgl_mulai_event)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
                                                        <span className="flex-shrink-0">📍</span>
                                                        <span className="truncate">{event.area_event || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
                                                        <span className="flex-shrink-0">👥</span>
                                                        <span className="truncate">{event.jumlah_pax ? event.jumlah_pax + ' orang' : '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
                                                        <span className="flex-shrink-0">👤</span>
                                                        <span className="truncate">{event.pic?.nama_pegawai || '-'}</span>
                                                    </div>
                                                </div>

                                                {/* Note pill */}
                                                {event.note_event && (
                                                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                        <span className="text-xs flex-shrink-0">📝</span>
                                                        <p className="text-[10px] text-yellow-300/80 line-clamp-2 leading-relaxed">{event.note_event}</p>
                                                    </div>
                                                )}

                                                {/* Payment compact */}
                                                {dealHarga > 0 && (
                                                    <div className="mt-auto pt-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[11px] font-black text-yellow-400">{formatBudget(dealHarga)}</span>
                                                            {lunas ? (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/30 rounded-full">✓ Lunas</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold text-yellow-500">{pct}%</span>
                                                            )}
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-1.5 rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                                        </div>
                                                        {!lunas && (
                                                            <p className="mt-1 text-[10px] text-orange-400 font-bold">
                                                                Sisa: {formatBudget(sisa)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Buttons: Bukti */}
                                                <div className="flex gap-1.5 mt-auto pt-1">
                                                    <button onClick={() => openUpload(event)}
                                                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-yellow-500/10 text-yellow-400 text-[11px] font-bold rounded-xl hover:bg-yellow-500/20 transition-colors border border-yellow-500/30">
                                                        <Upload size={12} />
                                                        Bukti
                                                    </button>
                                                    <button onClick={() => setExpandedEvent(isExpanded ? null : event.id_event)}
                                                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-xl transition-colors border ${
                                                            isExpanded
                                                                ? 'bg-gray-700 text-gray-200 border-gray-600'
                                                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                                                        }`}>
                                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        {event.bukti_pembayaran?.length ?? 0} Bukti
                                                    </button>
                                                </div>

                                                {/* Kontrak (download saja — upload dikelola tim internal) */}
                                                {event.kontrak_file && (
                                                    <div className="flex gap-1.5 mt-1.5">
                                                        <a href={`/kontrak/${event.kontrak_file}`}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500/10 text-blue-400 text-[11px] font-bold rounded-xl hover:bg-blue-500/20 transition-colors border border-blue-500/30">
                                                            <FileText size={12} />
                                                            Kontrak
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Expanded: Riwayat Bukti (col-span-full) ── */}
                                        {isExpanded && (
                                            <div className="col-span-full bg-gray-900 border border-gray-700 rounded-2xl p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-extrabold text-white">
                                                        Riwayat Bukti Pembayaran
                                                        <span className="ml-2 text-xs font-normal text-gray-400">— {event.nama_event}</span>
                                                    </h4>
                                                    <button onClick={() => setExpandedEvent(null)}
                                                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Detail info row */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                                    {dealHarga > 0 && (
                                                        <>
                                                            <div className="p-3 bg-gray-800 rounded-xl">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total Deal</p>
                                                                <p className="text-sm font-black text-yellow-400">{formatBudget(dealHarga)}</p>
                                                            </div>
                                                            <div className="p-3 bg-gray-800 rounded-xl">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Terbayar</p>
                                                                <p className="text-sm font-black text-green-400">{formatBudget(dibayar)}</p>
                                                            </div>
                                                            <div className="p-3 bg-gray-800 rounded-xl">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Sisa</p>
                                                                <p className={`text-sm font-black ${lunas ? 'text-green-400' : 'text-orange-400'}`}>
                                                                    {lunas ? '✓ Lunas' : formatBudget(sisa)}
                                                                </p>
                                                            </div>
                                                            <div className="p-3 bg-gray-800 rounded-xl">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Progress</p>
                                                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                                    <div className="h-1.5 rounded-full"
                                                                        style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                                                </div>
                                                                <p className="text-[10px] font-black text-yellow-400 mt-0.5">{pct}%</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Bukti list */}
                                                {event.bukti_pembayaran && event.bukti_pembayaran.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {event.bukti_pembayaran.map(bukti => (
                                                            <div key={bukti.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-lg flex-shrink-0">
                                                                        <FileText size={14} className="text-gray-400" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-white truncate">
                                                                            {bukti.nominal ? formatBudget(bukti.nominal) : 'Bukti Pembayaran'}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-500">
                                                                            {new Date(bukti.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </p>
                                                                        {bukti.keterangan && <p className="text-[10px] text-gray-400 truncate">{bukti.keterangan}</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${getBuktiStatusColor(bukti.status)}`}>
                                                                        {bukti.status}
                                                                    </span>
                                                                    <a href={`/${bukti.file_bukti}`} target="_blank" rel="noreferrer"
                                                                        className="p-1 text-gray-400 hover:text-yellow-400 transition-colors">
                                                                        <Eye size={13} />
                                                                    </a>
                                                                    {bukti.status === 'Menunggu' && (
                                                                        <button onClick={() => handleDeleteBukti(bukti.id)}
                                                                            className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                                                                            <X size={13} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center text-gray-600">
                                                        <FileText size={28} className="mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm font-bold">Belum ada bukti pembayaran</p>
                                                    </div>
                                                )}

                                                {/* Ditolak warning */}
                                                {event.bukti_pembayaran?.some(b => b.status === 'Ditolak') && (
                                                    <div className="p-3 mt-3 border bg-red-500/10 border-red-500/20 rounded-xl">
                                                        <p className="mb-1 text-xs font-bold text-red-400">⚠️ Ada Bukti Ditolak</p>
                                                        {event.bukti_pembayaran.filter(b => b.status === 'Ditolak').map(b => (
                                                            <div key={b.id}>
                                                                {b.catatan_finance && <p className="text-xs text-red-300 mb-1">Alasan: {b.catatan_finance}</p>}
                                                            </div>
                                                        ))}
                                                        <p className="text-xs text-yellow-400 mt-1">💡 Hapus bukti yang ditolak lalu upload ulang.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        </Fragment>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center border-2 border-gray-800 border-dashed rounded-3xl">
                                    <Calendar size={48} className="mx-auto mb-4 text-gray-700" />
                                    <p className="text-lg font-bold text-gray-500">Belum ada event</p>
                                    <p className="mt-1 text-sm text-gray-600">Event yang sudah di-deal akan muncul di sini.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: PAYMENTS */}
                    {activeTab === 'payments' && (() => {
                        const sumBayar  = (e) => (e.bukti_pembayaran || [])
                            .filter(b => b.status === 'Diverifikasi')
                            .reduce((a, b) => a + (Number(b.nominal) || 0), 0);
                        const payEvents = (events || []).filter(e => Number(e.deal_harga_event) > 0);
                        const totalTagihan  = payEvents.reduce((s, e) => s + Number(e.deal_harga_event || 0), 0);
                        const totalTerbayar = payEvents.reduce((s, e) => s + sumBayar(e), 0);
                        const totalSisa     = Math.max(0, totalTagihan - totalTerbayar);

                        if (payEvents.length === 0) {
                            return (
                                <div className="py-20 text-center border-2 border-gray-800 border-dashed rounded-3xl">
                                    <span className="block mb-4 text-5xl">💳</span>
                                    <p className="text-lg font-bold text-gray-500">Belum ada tagihan</p>
                                    <p className="mt-1 text-sm text-gray-600">Tagihan muncul setelah event Anda memiliki harga deal.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-4">
                                {/* Ringkasan keuangan */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="p-5 bg-gray-900 border border-gray-800 rounded-2xl">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Tagihan</p>
                                        <p className="text-xl font-black text-yellow-400">{formatBudget(totalTagihan)}</p>
                                    </div>
                                    <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Terbayar</p>
                                        <p className="text-xl font-black text-green-400">{formatBudget(totalTerbayar)}</p>
                                    </div>
                                    <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sisa</p>
                                        <p className="text-xl font-black text-orange-400">{totalSisa === 0 ? '✓ Lunas' : formatBudget(totalSisa)}</p>
                                    </div>
                                </div>

                                {/* Daftar tagihan per event */}
                                {payEvents.map(event => {
                                    const dibayar    = sumBayar(event);
                                    const dealHarga  = Number(event.deal_harga_event) || 0;
                                    const pct        = dealHarga > 0 ? Math.min(100, Math.round((dibayar / dealHarga) * 100)) : 0;
                                    const lunas      = dibayar >= dealHarga;
                                    const sisa       = dealHarga - dibayar;
                                    const isExpanded = expandedEvent === event.id_event;
                                    const buktiList  = event.bukti_pembayaran || [];

                                    return (
                                    <div key={event.id_event} className="p-5 bg-gray-900 border border-gray-800 rounded-2xl">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-black text-white truncate">{event.nama_event}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{formatTanggal(event.tgl_mulai_event)}</p>
                                            </div>
                                            {lunas
                                                ? <span className="px-2 py-1 text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/30 rounded-full flex-shrink-0">✓ LUNAS</span>
                                                : <span className="px-2 py-1 text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full flex-shrink-0">{pct}%</span>
                                            }
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
                                                <p className="text-sm font-bold text-yellow-400">{formatBudget(dealHarga)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Terbayar</p>
                                                <p className="text-sm font-bold text-green-400">{formatBudget(dibayar)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sisa</p>
                                                <p className={`text-sm font-bold ${lunas ? 'text-green-400' : 'text-orange-400'}`}>{lunas ? '✓' : formatBudget(sisa)}</p>
                                            </div>
                                        </div>

                                        <div className="w-full h-2 mb-3 overflow-hidden bg-gray-800 rounded-full">
                                            <div className="h-2 rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => openUpload(event)}
                                                className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-yellow-400 transition-colors border bg-yellow-500/10 rounded-xl hover:bg-yellow-500/20 border-yellow-500/30">
                                                <Upload size={13} /> Upload Bukti
                                            </button>
                                            <button onClick={() => setExpandedEvent(isExpanded ? null : event.id_event)}
                                                className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-gray-300 transition-colors bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700">
                                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                {buktiList.length} Bukti
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="pt-3 mt-3 border-t border-gray-800">
                                                {buktiList.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {buktiList.map(bukti => (
                                                            <div key={bukti.id} className="flex items-center justify-between p-2.5 bg-gray-800 rounded-xl">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <FileText size={14} className="flex-shrink-0 text-gray-400" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-white truncate">{bukti.nominal ? formatBudget(bukti.nominal) : 'Bukti'}</p>
                                                                        <p className="text-[10px] text-gray-500">{new Date(bukti.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${getBuktiStatusColor(bukti.status)}`}>{bukti.status}</span>
                                                                    <a href={`/${bukti.file_bukti}`} target="_blank" rel="noreferrer" className="p-1 text-gray-400 transition-colors hover:text-yellow-400"><Eye size={13} /></a>
                                                                    {bukti.status === 'Menunggu' && (
                                                                        <button onClick={() => handleDeleteBukti(bukti.id)} className="p-1 text-gray-400 transition-colors hover:text-red-400"><X size={13} /></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-4 text-sm text-center text-gray-600">Belum ada bukti pembayaran</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Modal Cancel Appointment */}
            {cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-gray-900 border border-gray-700 shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-white">Batalkan Appointment</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{cancelModal.jenis_event}</p>
                            </div>
                            <button onClick={() => setCancelModal(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-xs text-red-400 font-bold">⚠️ Perhatian</p>
                            <p className="text-xs text-red-300 mt-1">Appointment yang dibatalkan tidak dapat dikembalikan. Tim kami akan menerima notifikasi pembatalan ini.</p>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                Alasan Pembatalan <span className="text-red-400 normal-case font-normal">* wajib isi</span>
                            </label>
                            <textarea
                                rows={3}
                                value={alasanBatal}
                                onChange={e => setAlasanBatal(e.target.value)}
                                placeholder="Jelaskan alasan pembatalan (min. 5 karakter)..."
                                className="w-full px-4 py-3 text-sm text-white placeholder-gray-600 bg-black border border-gray-700 resize-none rounded-xl focus:border-red-500 focus:outline-none"
                            />
                            <div className="flex items-center justify-between mt-1">
                                {alasanBatal.trim().length > 0 && alasanBatal.trim().length < 5
                                    ? <p className="text-[10px] text-red-400">⚠ Minimal 5 karakter</p>
                                    : <span />
                                }
                                <p className="text-[10px] text-gray-600">{alasanBatal.length}/500</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal(null)}
                                className="flex-1 py-2.5 border border-gray-700 text-gray-400 font-bold rounded-xl hover:bg-gray-800 transition-colors text-sm">
                                Kembali
                            </button>
                            <button
                                onClick={submitCancel}
                                disabled={cancelLoading || !alasanBatal.trim() || alasanBatal.trim().length < 5}
                                className="flex-1 py-2.5 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {cancelLoading ? 'Memproses...' : 'Ya, Batalkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Upload Bukti */}
            {uploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-gray-900 border border-gray-700 shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-white">Upload Bukti Pembayaran</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{uploadModal.nama_event}</p>
                            </div>
                            <button onClick={() => { setUploadModal(null); reset(); }}
                                className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                    File Bukti * (JPG, PNG, PDF — max 5MB)
                                </label>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={e => setData('file_bukti', e.target.files[0])}
                                    className="w-full px-4 py-3 text-sm text-white bg-black border border-gray-700 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-yellow-500 file:text-black" />
                                {errors.file_bukti && <p className="mt-1 text-xs text-red-400">{errors.file_bukti}</p>}
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">Nominal Pembayaran</label>
                                <RupiahInput value={data.nominal}
                                    onChange={v => setData('nominal', v)}
                                    placeholder="Contoh: 5.000.000"
                                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-600 bg-black border border-gray-700 rounded-xl focus:border-yellow-500" />
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">Keterangan</label>
                                <textarea rows={3} value={data.keterangan}
                                    onChange={e => setData('keterangan', e.target.value)}
                                    placeholder="Contoh: DP 50%, transfer BCA"
                                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-600 bg-black border border-gray-700 resize-none rounded-xl focus:border-yellow-500" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setUploadModal(null); reset(); }}
                                    className="flex-1 py-2.5 border border-gray-700 text-gray-400 font-bold rounded-xl hover:bg-gray-800">
                                    Batal
                                </button>
                                <button type="submit" disabled={processing}
                                    className="flex-1 py-2.5 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 disabled:opacity-60">
                                    {processing ? 'Mengupload...' : '📤 Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus Bukti */}
            {deleteBuktiId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10">
                            <span className="text-3xl">🗑️</span>
                        </div>
                        <h2 className="mb-2 text-lg font-extrabold text-center text-white">Hapus Bukti Pembayaran?</h2>
                        <p className="mb-6 text-sm text-center text-gray-400">Bukti yang dihapus tidak bisa dikembalikan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteBuktiId(null)}
                                className="flex-1 py-2.5 border border-gray-600 text-gray-300 font-bold rounded-xl hover:bg-gray-800 transition-colors">
                                Batal
                            </button>
                            <button onClick={confirmDeleteBukti} disabled={deletingBukti}
                                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">
                                {deletingBukti ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
