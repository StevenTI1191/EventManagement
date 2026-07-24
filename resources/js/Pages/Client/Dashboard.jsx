import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import RupiahInput from '@/Components/RupiahInput';
import {
    Plus, Calendar, Clock, CheckCircle, XCircle,
    AlertCircle, LogOut, Home, Upload, FileText,
    ChevronDown, ChevronUp, X, Eye, Bell, Trash2, CheckCheck,
    User, Timer, Download, Music, Utensils, Info, Wallet
} from 'lucide-react';

export default function ClientDashboard({
    appointments, events, penawaran = [], totalAppointments, totalEvents, slots = [],
}) {
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
        if (tipe === 'penawaran') return '📩';
        return '📅';
    };
    // ── SEMUA HOOKS HARUS DI ATAS — sebelum return kondisional apapun ──
    // Bila ada penawaran menunggu keputusan, buka tab itu lebih dulu supaya klien
    // langsung melihatnya (dulu blok penawaran selalu tampil di atas semua tab).
    const [activeTab, setActiveTab]         = useState(penawaran.length > 0 ? 'penawaran' : 'appointments');
    const [aptFilter, setAptFilter]         = useState('Semua');
    const [evFilter, setEvFilter]           = useState('Semua'); // Semua | Berjalan | Selesai
    const [aptSearch, setAptSearch]         = useState('');
    // Panel yang sedang terbuka pada sebuah kartu event: { id, tab: 'acara' | 'bukti' } | null.
    // Dua tombol berbeda (Detail Acara & Pembayaran) memakai satu state agar hanya
    // satu panel terbuka per kartu.
    const [expandedEvent, setExpandedEvent] = useState(null);
    const panelOpen   = (id, tab) => expandedEvent?.id === id && expandedEvent?.tab === tab;
    const togglePanel = (id, tab) => setExpandedEvent(prev => (prev?.id === id && prev?.tab === tab) ? null : { id, tab });
    const [uploadModal, setUploadModal]     = useState(null);
    // Validasi bukti di sisi klien saat file dipilih (tipe/ukuran + pratinjau).
    const [buktiWarning, setBuktiWarning]   = useState('');
    const [buktiPreview, setBuktiPreview]   = useState(null);
    const [cancelModal, setCancelModal]     = useState(null);
    const [alasanBatal, setAlasanBatal]     = useState('');
    // Usulan jadwal alternatif dari klien (reschedule dua arah).
    const [usulModal, setUsulModal]         = useState(null);
    const [usulForm, setUsulForm]           = useState({ usulan_tgl: '', usulan_jam: '', usulan_catatan: '' });
    const [usulLoading, setUsulLoading]     = useState(false);
    const [usulErrors, setUsulErrors]       = useState({});
    // Pengajuan pembatalan + refund acara.
    const [pembatalanModal, setPembatalanModal] = useState(null);
    const [pembatalanAlasan, setPembatalanAlasan] = useState('');
    const [pembatalanLoading, setPembatalanLoading] = useState(false);
    const [deleteBuktiId, setDeleteBuktiId] = useState(null);
    const [deletingBukti, setDeletingBukti] = useState(false);
    const [tolakModal, setTolakModal]       = useState(null); // event penawaran yang ditolak
    const [alasanTolak, setAlasanTolak]     = useState('');
    const [prosesPenawaran, setProsesPenawaran] = useState(null); // id_event yang sedang diproses
    // Ajukan penyesuaian / negosiasi lanjutan atas penawaran.
    const [penyesuaianModal, setPenyesuaianModal] = useState(null);
    const [penyesuaianPesan, setPenyesuaianPesan] = useState('');
    const [penyesuaianMeeting, setPenyesuaianMeeting] = useState(false);

    const terimaPenawaran = (id_event) => {
        if (prosesPenawaran) return;
        setProsesPenawaran(id_event);
        router.post(route('client.penawaran.terima', id_event), {}, {
            preserveScroll: true,
            onFinish: () => setProsesPenawaran(null),
        });
    };

    const submitTolakPenawaran = () => {
        if (!tolakModal || prosesPenawaran) return;
        setProsesPenawaran(tolakModal.id_event);
        router.post(route('client.penawaran.tolak', tolakModal.id_event), { alasan: alasanTolak }, {
            preserveScroll: true,
            onSuccess: () => { setTolakModal(null); setAlasanTolak(''); },
            onFinish: () => setProsesPenawaran(null),
        });
    };

    const submitPenyesuaian = () => {
        if (!penyesuaianModal || prosesPenawaran || penyesuaianPesan.trim().length < 5) return;
        setProsesPenawaran(penyesuaianModal.id_event);
        router.post(route('client.penawaran.penyesuaian', penyesuaianModal.id_event),
            { pesan: penyesuaianPesan, minta_meeting: penyesuaianMeeting }, {
            preserveScroll: true,
            onSuccess: () => { setPenyesuaianModal(null); setPenyesuaianPesan(''); setPenyesuaianMeeting(false); },
            onFinish: () => setProsesPenawaran(null),
        });
    };

    const { data, setData, post, processing, reset, errors } = useForm({
        id_event: '',
        id_invoice: '',
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
        if (status === 'Dikonfirmasi') return 'bg-ok-bg text-ok border-ok/30';
        if (status === 'Pending')      return 'bg-gold-soft text-gold-dim border-gold-2';
        if (status === 'Reschedule')   return 'bg-blue-500/10 text-info border-blue-500/30';
        if (status === 'Selesai')      return 'bg-paper text-muted border-line';
        if (status === 'Dibatalkan')   return 'bg-danger-bg text-danger border-danger/30';
        return 'bg-paper text-muted border-line';
    };

    // Status untuk Event
    const getEventStatusColor = (status) => {
        if (status === 'Deal')      return 'bg-gold-soft text-gold-dim border-gold-2';
        if (status === 'Upcoming')    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        if (status === 'Penyelesaian') return 'bg-warn-bg text-warn border-warn/30';
        if (status === 'Done')      return 'bg-green-500/20 text-green-300 border-ok/30';
        if (status === 'Pending')   return 'bg-gold-soft text-gold border-gold-2';
        if (status === 'Cancelled') return 'bg-red-500/20 text-red-300 border-danger/30';
        return 'bg-paper text-muted border-line';
    };

    const getEventStatusLabel = (status) => {
        if (status === 'Deal')      return 'Menunggu DP';
        if (status === 'Upcoming')    return 'Upcoming';
        if (status === 'Penyelesaian') return 'Sedang dituntaskan';
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
        if (status === 'Diverifikasi') return 'bg-ok-bg text-ok border-ok/30';
        if (status === 'Menunggu') return 'bg-gold-soft text-gold-dim border-gold-2';
        if (status === 'Ditolak') return 'bg-danger-bg text-danger border-danger/30';
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

    // Total terbayar sebuah event. Diambil dari yang lebih besar antara nilai
    // invoice yang sudah LUNAS (termasuk yang ditandai lunas manual oleh Finance
    // tanpa unggah bukti) dan total bukti terverifikasi (menangkap pembayaran
    // sebagian yang belum melunasi satu invoice pun). Dengan begitu, begitu
    // invoice ditandai lunas, sisa pembayaran otomatis ikut nol.
    const terbayarEvent = (event) => {
        const lunasInvoice = (event.invoices || [])
            .filter(i => i.status === 'Lunas')
            .reduce((s, i) => s + (Number(i.nominal) || 0), 0);
        const buktiVerif = (event.bukti_pembayaran || [])
            .filter(b => b.status === 'Diverifikasi')
            .reduce((s, b) => s + (Number(b.nominal) || 0), 0);
        return Math.max(lunasInvoice, buktiVerif);
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

    const openUsul = (apt) => {
        setUsulForm({ usulan_tgl: '', usulan_jam: '', usulan_catatan: '' });
        setUsulErrors({});
        setUsulModal(apt);
    };

    const submitUsul = (e) => {
        e.preventDefault();
        if (usulLoading) return;
        setUsulErrors({});
        setUsulLoading(true);
        router.post(route('client.appointment.usul-jadwal', usulModal.id), usulForm, {
            preserveScroll: true,
            onSuccess: () => { setUsulModal(null); setUsulErrors({}); },
            onError: (errs) => setUsulErrors(errs),
            onFinish: () => setUsulLoading(false),
        });
    };

    const submitPembatalan = (e) => {
        e.preventDefault();
        if (pembatalanLoading) return;
        setPembatalanLoading(true);
        router.post(route('client.event.ajukan-pembatalan', pembatalanModal.id_event), { alasan: pembatalanAlasan }, {
            preserveScroll: true,
            onSuccess: () => { setPembatalanModal(null); setPembatalanAlasan(''); },
            onFinish: () => setPembatalanLoading(false),
        });
    };

    const bersihkanPreview = () => {
        setBuktiWarning('');
        setBuktiPreview((url) => { if (url) URL.revokeObjectURL(url); return null; });
    };

    // Cek berkas begitu dipilih (tidak menunggu tombol Upload ditekan). Isi gambar
    // tetap diverifikasi server (OCR); di sini hanya tipe, ukuran, & pratinjau.
    const pilihFileBukti = (e) => {
        const file = e.target.files?.[0] || null;
        bersihkanPreview();
        setData('file_bukti', file);
        if (!file) return;

        const tipeOk   = /\.(jpe?g|png|pdf)$/i.test(file.name) || ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
        const ukuranOk = file.size <= 5 * 1024 * 1024;

        if (!tipeOk) {
            setBuktiWarning('Format tidak didukung. Unggah gambar JPG/PNG atau PDF bukti transfer.');
        } else if (!ukuranOk) {
            setBuktiWarning(`Ukuran file ${(file.size / 1048576).toFixed(1)} MB melebihi 5 MB. Perkecil dulu.`);
        } else if (file.type.startsWith('image/')) {
            setBuktiPreview(URL.createObjectURL(file));
        }
    };

    const tutupUpload = () => { setUploadModal(null); bersihkanPreview(); reset(); };

    const openUpload = (event) => {
        reset();
        bersihkanPreview();
        // Tagihan yang masih tertunggak dipilih lebih dulu, beserta nominalnya —
        // supaya bukti langsung menempel ke tagihan yang benar.
        const tertunggak = (event.invoices || []).find(i => i.status !== 'Lunas');
        setData({
            id_event: event.id_event,
            id_invoice: tertunggak ? String(tertunggak.id_invoice) : '',
            file_bukti: null,
            nominal: tertunggak ? tertunggak.nominal : '',
            keterangan: '',
        });
        setUploadModal(event);
    };

    const handleUpload = (e) => {
        e.preventDefault();
        post(route('client.bukti.upload'), {
            forceFormData: true,
            onSuccess: () => { setUploadModal(null); bersihkanPreview(); reset(); },
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

    // Filter tab "Event Saya": berjalan (deal→penyelesaian) vs selesai (Done).
    const eventMatchesFilter = (e) => {
        if (evFilter === 'Berjalan') return ['Deal', 'Upcoming', 'Penyelesaian'].includes(e.status_event);
        if (evFilter === 'Selesai')  return e.status_event === 'Done';
        return true;
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
            <div className="min-h-screen bg-paper">

                {/* Navbar */}
                <nav className="sticky top-0 z-40 px-6 py-3 bg-surface/95 backdrop-blur-md border-b border-line">
                    <div className="flex items-center justify-between max-w-6xl mx-auto">

                        {/* ── Left: Brand ── */}
                        <a href={BASE_URL} className="flex items-center gap-2.5 group">
                            <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-surface border border-gold rounded-full transition-transform group-hover:scale-110">
                                <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-ink leading-none">
                                    Laksamana <span className="text-gold">Muda</span>
                                </span>
                                <p className="text-[10px] text-muted-2 leading-none mt-0.5">Dashboard Client</p>
                            </div>
                        </a>

                        {/* ── Right: Actions ── */}
                        <div className="flex items-center gap-2">

                            {/* Home link */}
                            <a href={BASE_URL}
                                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:text-gold-dim hover:bg-gold-soft transition-all"
                                title="Beranda">
                                <Home size={17} />
                            </a>

                            {/* Bell Notifikasi */}
                            <div className="relative" ref={notifRef}>
                                <button onClick={() => { setShowNotif(p => !p); if (!showNotif) fetchNotif(); }}
                                    className="relative flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:text-gold-dim hover:bg-gold-soft transition-all">
                                    <Bell size={17} />
                                    {unread > 0 && (
                                        <span className="absolute flex items-center justify-center w-4 h-4 text-[9px] font-black text-white bg-gold-2 rounded-full -top-0.5 -right-0.5">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                </button>

                                {showNotif && (
                                    <div className="absolute right-0 z-50 overflow-hidden bg-surface border border-line shadow-2xl top-10 w-80 rounded-2xl">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-extrabold text-ink">Notifikasi</p>
                                                {unread > 0 && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-black text-white bg-gold-2 rounded-full">
                                                        {unread} baru
                                                    </span>
                                                )}
                                            </div>
                                            {unread > 0 && (
                                                <button onClick={markAllRead}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-muted hover:text-gold-dim transition-colors">
                                                    <CheckCheck size={11} /> Baca semua
                                                </button>
                                            )}
                                        </div>

                                        <div className="overflow-y-auto divide-y divide-line max-h-72">
                                            {notifs.length > 0 ? notifs.map(n => (
                                                <div key={n.id}
                                                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? 'bg-gold/5' : 'hover:bg-paper/50'}`}>
                                                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mt-0.5 bg-paper rounded-full text-base">
                                                        {getNotifIcon(n.tipe)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-extrabold text-ink">{n.judul}</p>
                                                        <p className="mt-0.5 text-xs leading-relaxed text-muted line-clamp-2">{n.pesan}</p>
                                                        <p className="mt-1 text-[10px] text-muted-2">{formatNotifTime(n.created_at)}</p>
                                                    </div>
                                                    <button onClick={() => removeNotif(n.id)}
                                                        className="flex-shrink-0 mt-0.5 text-muted-2 hover:text-danger transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )) : (
                                                <div className="py-10 text-center text-muted-2">
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
                                            ? 'bg-gold/15 border-gold-2'
                                            : 'bg-paper border-line hover:border-gold/40 hover:bg-gold-soft'
                                    }`}>
                                    <div className="flex items-center justify-center w-6 h-6 text-[11px] font-black text-white bg-gold rounded-lg flex-shrink-0">
                                        {user?.nama_client?.substring(0, 1).toUpperCase() ?? 'C'}
                                    </div>
                                    <span className="hidden sm:block text-xs font-bold text-ink max-w-[80px] truncate">
                                        {user?.nama_client?.split(' ')[0] ?? 'Client'}
                                    </span>
                                    <ChevronDown size={13} className={`text-muted transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-11 w-52 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50">
                                        {/* User info header */}
                                        <div className="px-4 py-3 border-b border-line">
                                            <p className="text-xs font-bold text-ink truncate">{user?.nama_client}</p>
                                            <p className="text-[10px] text-muted truncate mt-0.5">{user?.email_client}</p>
                                        </div>

                                        {/* Menu items */}
                                        <div className="py-1">
                                            <Link href={route('client.profile')}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:bg-gold-soft hover:text-gold-dim transition-colors">
                                                <User size={14} className="flex-shrink-0" />
                                                Profil Saya
                                            </Link>
                                            <Link href={route('client.appointment.create')}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:bg-gold-soft hover:text-gold-dim transition-colors">
                                                <Calendar size={14} className="flex-shrink-0" />
                                                Buat Appointment
                                            </Link>
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-line py-1">
                                            <Link href={route('client.logout')} method="post" as="button"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger-bg transition-colors">
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
                            <h1 className="text-2xl font-black text-ink sm:text-3xl">
                                Halo, <span className="text-gold">{user?.nama_client?.split(' ')[0] || user?.email_client?.split('@')[0] || 'Client'}</span>! 👋
                            </h1>
                            <p className="mt-1 text-sm text-muted">Kelola appointment dan event Anda di sini.</p>
                        </div>
                        <Link href={route('client.appointment.create')}
                            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-gold-grad shadow-gold text-white font-black rounded-xl hover:brightness-110 transition-all text-sm">
                            <Plus size={16} strokeWidth={3} />
                            Buat Appointment
                        </Link>
                    </div>

                    {/* Flash */}
                    {flash?.success && (
                        <div className="p-4 mb-6 font-bold text-gold-dim border bg-gold-soft border-gold-2 rounded-xl">
                            ✅ {flash.success}
                        </div>
                    )}

                    {/* Banner: lengkapi profil. Nama perusahaan hanya wajib utk klien tipe Perusahaan. */}
                    {(() => {
                        const perluPerusahaan = user?.tipe_client === 'Perusahaan';
                        const kurangPerusahaan = perluPerusahaan && !user?.perusahaan_client;
                        const kurangHp = !user?.no_telp_client;
                        return (kurangHp || kurangPerusahaan) && (
                        <div className="flex items-center justify-between gap-4 p-4 mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl flex-shrink-0">📋</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-blue-300">Lengkapi profil Anda</p>
                                    <p className="text-xs text-info/70 mt-0.5 leading-relaxed">
                                        {kurangPerusahaan && kurangHp
                                            ? 'Nama perusahaan & nomor HP belum diisi — wajib untuk membuat appointment.'
                                            : kurangPerusahaan
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
                        );
                    })()}

                    {/* ── SEGERA LUNASI — muncul begitu Finance menerbitkan invoice (DP atau pelunasan) ── */}
                    {(() => {
                        // Hitung acara yang punya invoice terbit tapi belum lunas.
                        // DP menandakan booking belum aman; pelunasan menandakan sisa
                        // pembayaran menjelang hari-H. Keduanya harus lunas sebelum acara.
                        const adaDp = (e) => (e.invoices || []).some(i => i.tipe === 'DP' && i.status !== 'Lunas');
                        const adaPelunasan = (e) => (e.invoices || []).some(i => i.tipe === 'Pelunasan' && i.status !== 'Lunas');
                        const perluDP        = (events || []).filter(adaDp);
                        const perluPelunasan = (events || []).filter(e => !adaDp(e) && adaPelunasan(e));
                        const total = perluDP.length + perluPelunasan.length;

                        if (total === 0) return null;

                        // Susun pesan sesuai jenis tagihan yang tertunggak.
                        const bagian = [];
                        if (perluDP.length)        bagian.push(`uang muka untuk ${perluDP.length} acara`);
                        if (perluPelunasan.length) bagian.push(`pelunasan untuk ${perluPelunasan.length} acara`);
                        const judul = perluDP.length && !perluPelunasan.length ? 'Segera lunasi DP'
                                    : !perluDP.length && perluPelunasan.length ? 'Segera lunasi pelunasan'
                                    : 'Ada tagihan menunggu pembayaran';

                        return (
                            <div className="flex flex-col gap-3 p-4 mb-6 border sm:flex-row sm:items-center sm:justify-between bg-orange-500/10 border-orange-500/30 rounded-xl">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="flex-shrink-0 text-xl">💳</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-orange-300">{judul}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-orange-200/80">
                                            Finance sudah menerbitkan invoice {bagian.join(' dan ')}. Mohon dilunasi
                                            paling lambat sehari sebelum acara agar jadwal Anda tetap aman.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveTab('payments')}
                                    className="self-start flex-shrink-0 px-3 py-1.5 text-xs font-bold text-white transition-all bg-gold-grad shadow-gold rounded-lg hover:brightness-110 whitespace-nowrap sm:self-auto">
                                    Lunasi Sekarang →
                                </button>
                            </div>
                        );
                    })()}

                    {/* ── STAT SUMMARY CARDS (sekaligus tab selector) ── */}
                    {(() => {
                        const aptAktif = appointments.filter(a =>
                            ['Pending', 'Dikonfirmasi', 'Reschedule'].includes(a.status)
                        ).length;

                        const evList        = events || [];
                        // Berjalan = sudah deal sampai proses penyelesaian; Selesai = Done.
                        // Keduanya kini dibaca dalam satu tab "Event Saya".
                        const eventBerjalan = evList.filter(e =>
                            ['Deal', 'Upcoming', 'Penyelesaian'].includes(e.status_event)
                        ).length;
                        const eventSelesai  = evList.filter(e => e.status_event === 'Done').length;

                        const eventBelumLunas = evList.filter(event => {
                            if (!event.deal_harga_event) return false;
                            return terbayarEvent(event) < event.deal_harga_event;
                        }).length;

                        const cards = [
                            {
                                id:      'appointments',
                                icon:    '📋',
                                value:   totalAppointments ?? appointments.length,
                                label:   'Appointment',
                                badge:   aptAktif > 0
                                    ? { text: `${aptAktif} aktif`, cls: 'bg-gold-soft text-gold-dim border-gold-2' }
                                    : null,
                                sub:     aptAktif === 0 ? 'Tidak ada yang aktif' : null,
                            },
                            {
                                id:      'events',
                                icon:    '🎪',
                                value:   totalEvents ?? evList.length,
                                label:   'Event Saya',
                                // Satu tab untuk yang berjalan maupun sudah selesai;
                                // badge menonjolkan yang masih berjalan lebih dulu.
                                badge:   eventBerjalan > 0
                                    ? { text: `${eventBerjalan} berjalan`, cls: 'bg-blue-500/20 text-info border-blue-500/30' }
                                    : eventSelesai > 0
                                        ? { text: `${eventSelesai} selesai`, cls: 'bg-ok-bg text-ok border-ok/30' }
                                        : null,
                                sub:     (totalEvents ?? evList.length) === 0 ? 'Belum ada event' : null,
                            },
                            {
                                id:      'penawaran',
                                icon:    '📩',
                                value:   penawaran.length,
                                label:   'Penawaran',
                                // Penawaran = acara yang menunggu keputusan klien, belum di-DP.
                                badge:   penawaran.length > 0
                                    ? { text: 'perlu ditinjau', cls: 'bg-gold-soft text-gold-dim border-gold-2' }
                                    : null,
                                sub:     penawaran.length === 0 ? 'Tidak ada penawaran' : 'Belum di-DP',
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
                            <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
                                {cards.map((card, i) => {
                                    const effectiveTab = card.id;
                                    const isActive = activeTab === card.id;
                                    const accentMap = {
                                        orange: 'bg-orange-500/10 border-orange-500/40 hover:shadow-orange-500/10',
                                        green:  'bg-ok-bg border-ok/30 hover:shadow-green-500/10',
                                    };
                                    const valueCls = card.accent === 'orange'
                                        ? 'text-orange-400'
                                        : card.accent === 'green'
                                            ? 'text-ok'
                                            : 'text-ink';

                                    return (
                                        <button key={i}
                                            onClick={() => setActiveTab(effectiveTab)}
                                            className={`p-5 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                                card.accent
                                                    ? accentMap[card.accent]
                                                    : isActive
                                                        ? 'bg-gold/15 border-gold-2 shadow-lg shadow-yellow-500/10'
                                                        : 'bg-surface border-line hover:border-gold-2'
                                            } ${isActive ? 'ring-2 ring-gold/40' : ''}`}>
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
                                            <p className="text-xs text-muted">
                                                {card.label}
                                                {card.sub && <span className="ml-1 text-muted-2">— {card.sub}</span>}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* TAB: PENAWARAN (event tahap Negotiation — menunggu keputusan klien, belum di-DP) */}
                    {activeTab === 'penawaran' && (penawaran.length > 0 ? (
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-ink">Penawaran untuk Anda</h2>
                                <span className="px-2 py-0.5 text-[10px] font-black bg-gold text-white rounded-full">{penawaran.length}</span>
                            </div>
                            <p className="-mt-1 text-sm text-muted">Tim kami mengirimkan penawaran acara berikut. Tinjau detail &amp; harga, lalu terima atau tolak.</p>
                            {penawaran.map(p => (
                                <div key={p.id_event} className="p-5 border-2 shadow-lm bg-surface border-gold-2 rounded-2xl">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <h3 className="text-base font-black truncate text-ink">{p.nama_event}</h3>
                                            {p.kategori_event && <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase bg-gold-soft text-gold-dim rounded-full">{p.kategori_event}</span>}
                                        </div>
                                        <span className="px-2.5 py-1 text-[10px] font-black text-gold-dim bg-gold-soft border border-gold-2 rounded-full shrink-0">PENAWARAN</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
                                        <div><p className="text-[10px] text-muted uppercase tracking-wider">Tanggal</p><p className="text-sm font-bold text-ink">{formatTanggal(p.tgl_mulai_event)}</p></div>
                                        <div><p className="text-[10px] text-muted uppercase tracking-wider">Lokasi</p><p className="text-sm font-bold text-ink">{p.area_event || '-'}</p></div>
                                        <div><p className="text-[10px] text-muted uppercase tracking-wider">Tamu</p><p className="text-sm font-bold text-ink">{p.jumlah_pax ? `${p.jumlah_pax} orang` : '-'}</p></div>
                                        <div><p className="text-[10px] text-muted uppercase tracking-wider">Total</p><p className="text-sm font-black text-gold-dim">{formatBudget(p.deal_harga_event)}</p></div>
                                    </div>

                                    {p.deskripsi_event && <p className="mb-4 text-sm leading-relaxed text-muted whitespace-pre-line">{p.deskripsi_event}</p>}

                                    {/* Status respon — agar klien tahu penolakannya tercatat, tidak terlihat polos */}
                                    {p.respon_klien === 'Ditolak' && (
                                        <div className="flex items-start gap-2 p-3 mb-4 border bg-danger-bg border-danger/30 rounded-xl">
                                            <XCircle size={15} className="text-danger mt-0.5 shrink-0" />
                                            <p className="text-xs text-muted">
                                                <span className="font-bold text-danger">Anda menolak penawaran ini</span>
                                                {p.tgl_respon_klien ? ` pada ${new Date(p.tgl_respon_klien).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}.
                                                Tim kami sudah diberi tahu dan akan menghubungi Anda. Bila berubah pikiran, Anda tetap bisa menerimanya.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        <a href={route('client.penawaran.pdf', p.id_event)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gold-dim bg-gold-soft border border-gold-2 rounded-xl hover:brightness-95 transition-all">
                                            <Download size={14} /> Lihat Penawaran (PDF)
                                        </a>
                                        <button onClick={() => terimaPenawaran(p.id_event)} disabled={prosesPenawaran === p.id_event}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-xl bg-emerald-600 shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-60">
                                            <CheckCircle size={14} /> {prosesPenawaran === p.id_event ? 'Memproses…' : 'Terima Penawaran'}
                                        </button>
                                        {p.respon_klien !== 'Ditolak' && (
                                            <button onClick={() => { setPenyesuaianPesan(''); setPenyesuaianMeeting(false); setPenyesuaianModal(p); }} disabled={prosesPenawaran === p.id_event}
                                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gold-dim bg-surface border border-gold-2 rounded-xl hover:bg-gold-soft transition-all disabled:opacity-60">
                                                💬 Ajukan Penyesuaian
                                            </button>
                                        )}
                                        {p.respon_klien !== 'Ditolak' && (
                                            <button onClick={() => { setAlasanTolak(''); setTolakModal(p); }} disabled={prosesPenawaran === p.id_event}
                                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-danger bg-danger-bg border border-danger/30 rounded-xl hover:brightness-95 transition-all disabled:opacity-60">
                                                <XCircle size={14} /> Tolak
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-line border-dashed rounded-3xl">
                            <span className="block mb-4 text-5xl">📩</span>
                            <p className="text-lg font-bold text-muted">Belum ada penawaran</p>
                            <p className="mt-1 text-sm text-muted-2">Penawaran acara dari tim kami akan muncul di sini untuk Anda tinjau, terima, atau tolak.</p>
                        </div>
                    ))}

                    {/* TAB: APPOINTMENTS */}
                    {activeTab === 'appointments' && (
                        <div className="space-y-4">

                            {/* Search bar */}
                            {appointments.length > 0 && (
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
                                    <input
                                        type="text"
                                        placeholder="Cari jenis event..."
                                        value={aptSearch}
                                        onChange={e => setAptSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface border border-line rounded-xl text-muted placeholder-muted-2 focus:border-gold-2 focus:outline-none transition-colors"
                                    />
                                    {aptSearch && (
                                        <button onClick={() => setAptSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-muted transition-colors">
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
                                                        ? 'bg-gold-grad text-white border-gold-dim'
                                                        : 'bg-surface text-muted border-line hover:border-gold/40 hover:text-gold-dim'
                                                }`}>
                                                {p.label}
                                                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                                    aptFilter === p.key ? 'bg-white/25 text-white' : 'bg-gold-soft text-muted'
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
                                <div key={apt.id} className="p-6 transition-colors bg-surface border border-line rounded-2xl hover:border-gold-2">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                <h3 className="text-base font-black text-ink sm:text-lg">{apt.jenis_event}</h3>
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
                                                                    ? 'bg-red-500/20 border-red-500 text-danger'
                                                                    : step.done
                                                                        ? 'bg-gold border-gold text-white'
                                                                        : 'bg-paper border-line text-muted-2'
                                                            }`}>
                                                                {step.cancelled ? '✕' : step.done ? '✓' : i + 1}
                                                            </div>
                                                            <span className={`text-[9px] font-bold whitespace-nowrap ${
                                                                step.cancelled ? 'text-danger' : step.done ? 'text-gold-dim' : 'text-muted-2'
                                                            }`}>{step.label}</span>
                                                        </div>
                                                        {i < arr.length - 1 && (
                                                            <div className={`h-px w-8 mb-3.5 ${step.done && !arr[i+1]?.cancelled ? 'bg-gold' : 'bg-gold-soft'}`} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-3 md:grid-cols-4">
                                                <div>
                                                    <p className="text-[10px] text-muted uppercase tracking-wider">Tanggal Request</p>
                                                    <p className="text-sm font-bold text-muted">{formatTanggal(apt.tgl_request)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted uppercase tracking-wider">Jam</p>
                                                    <p className="text-sm font-bold text-muted">{apt.jam_request || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted uppercase tracking-wider">Jumlah Tamu</p>
                                                    <p className="text-sm font-bold text-muted">{apt.jumlah_tamu ? apt.jumlah_tamu + ' orang' : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted uppercase tracking-wider">Est. Budget</p>
                                                    <p className="text-sm font-bold text-muted">{formatBudget(apt.estimasi_budget)}</p>
                                                </div>
                                            </div>
                                            {apt.deskripsi_event && <p className="mb-3 text-sm text-muted">{apt.deskripsi_event}</p>}
                                            {apt.status === 'Dikonfirmasi' && apt.tgl_konfirmasi && (
                                                <div className="p-3 border bg-ok-bg border-green-500/20 rounded-xl">
                                                    <p className="mb-1 text-xs font-bold text-ok">✅ Meeting Dikonfirmasi</p>
                                                    <p className="text-sm text-green-300">{formatTanggal(apt.tgl_konfirmasi)} {apt.jam_konfirmasi && `pukul ${apt.jam_konfirmasi}`}</p>
                                                    {apt.pegawai && (
                                                        <p className="mt-1 text-xs text-green-500/70">
                                                            👤 Dikonfirmasi oleh: <span className="font-bold text-ok">{apt.pegawai.nama_pegawai}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {apt.status === 'Reschedule' && apt.tgl_konfirmasi && (
                                                <div className="p-3 border bg-blue-500/10 border-blue-500/20 rounded-xl">
                                                    <p className="mb-1 text-xs font-bold text-info">🔄 Jadwal Diubah</p>
                                                    <p className="text-sm text-blue-300">{formatTanggal(apt.tgl_konfirmasi)} {apt.jam_konfirmasi && `pukul ${apt.jam_konfirmasi}`}</p>
                                                    {apt.pegawai && (
                                                        <p className="mt-1 text-xs text-blue-500/70">
                                                            👤 Di-reschedule oleh: <span className="font-bold text-info">{apt.pegawai.nama_pegawai}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {apt.usulan_tgl && ['Pending', 'Dikonfirmasi', 'Reschedule'].includes(apt.status) && (
                                                <div className="p-3 mt-3 border bg-gold-soft/60 border-gold-2 rounded-xl">
                                                    <p className="mb-1 text-xs font-bold text-gold-dim">🔄 Usulan jadwalmu (menunggu tinjauan tim)</p>
                                                    <p className="text-sm text-muted">{formatTanggal(apt.usulan_tgl)}{apt.usulan_jam && ` pukul ${String(apt.usulan_jam).substring(0,5)}`}</p>
                                                    {apt.usulan_catatan && <p className="mt-1 text-xs text-muted-2 italic">"{apt.usulan_catatan}"</p>}
                                                </div>
                                            )}
                                            {apt.catatan_em && (
                                                <div className="p-3 mt-3 bg-paper rounded-xl">
                                                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Catatan dari Tim</p>
                                                    <p className="text-sm text-muted">{apt.catatan_em}</p>
                                                </div>
                                            )}
                                            {apt.status === 'Dibatalkan' && apt.alasan_batal_client && (
                                                <div className="p-3 mt-3 bg-danger-bg border border-red-500/20 rounded-xl">
                                                    <p className="text-[10px] text-danger font-bold uppercase tracking-wider mb-1">Alasan Pembatalan (dari kamu)</p>
                                                    <p className="text-sm text-red-300">{apt.alasan_batal_client}</p>
                                                </div>
                                            )}
                                        </div>
                                        {['Pending', 'Dikonfirmasi', 'Reschedule'].includes(apt.status) && (
                                            <div className="flex flex-col gap-2 self-start sm:self-auto flex-shrink-0">
                                                <button onClick={() => openUsul(apt)}
                                                    className="px-3 py-1.5 text-xs font-bold text-gold-dim border border-gold-2 rounded-lg hover:bg-gold-soft transition-colors">
                                                    Usulkan jadwal
                                                </button>
                                                <button onClick={() => handleCancel(apt)}
                                                    className="px-3 py-1.5 text-xs font-bold text-danger border border-danger/30 rounded-lg hover:bg-danger-bg transition-colors">
                                                    Batalkan
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                // Filter ada hasil tapi kosong
                                <div className="py-12 text-center border border-line border-dashed rounded-2xl">
                                    <p className="font-bold text-muted">Tidak ada appointment berstatus <span className="text-gold">"{aptFilter}"</span>.</p>
                                    <button onClick={() => setAptFilter('Semua')}
                                        className="mt-3 text-xs font-bold text-gold-dim hover:text-gold transition-colors">
                                        Lihat semua →
                                    </button>
                                </div>
                            );
                            })()}

                            {/* Empty state: belum ada appointment sama sekali */}
                            {appointments.length === 0 && (
                                <div className="py-20 text-center border-2 border-line border-dashed rounded-3xl">
                                    <Calendar size={48} className="mx-auto mb-4 text-muted-2" />
                                    <p className="text-lg font-bold text-muted">Belum ada appointment</p>
                                    <p className="mt-1 mb-6 text-sm text-muted-2">Buat appointment untuk diskusi event Anda bersama tim kami.</p>
                                    <Link href={route('client.appointment.create')}
                                        className="inline-flex items-center gap-2 px-6 py-3 font-black text-white transition-all bg-gold-grad shadow-gold rounded-xl hover:brightness-110">
                                        <Plus size={18} />
                                        Buat Appointment Pertama
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: EVENTS — berjalan & selesai jadi satu, dipilah lewat pill */}
                    {activeTab === 'events' && (
                        <div>
                            {events && events.length > 0 && (() => {
                                const nBerjalan = events.filter(e => ['Deal', 'Upcoming', 'Penyelesaian'].includes(e.status_event)).length;
                                const nSelesai  = events.filter(e => e.status_event === 'Done').length;
                                const pills = [
                                    { key: 'Semua', label: 'Semua', count: events.length },
                                    ...(nBerjalan > 0 ? [{ key: 'Berjalan', label: 'Berjalan', count: nBerjalan }] : []),
                                    ...(nSelesai  > 0 ? [{ key: 'Selesai',  label: 'Selesai',  count: nSelesai  }] : []),
                                ];
                                return pills.length > 1 ? (
                                    <div className="flex flex-wrap gap-2 pb-4">
                                        {pills.map(p => (
                                            <button key={p.key} onClick={() => setEvFilter(p.key)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                                    evFilter === p.key
                                                        ? 'bg-gold-grad text-white border-gold-dim'
                                                        : 'bg-surface text-muted border-line hover:border-gold/40 hover:text-gold-dim'
                                                }`}>
                                                {p.label}
                                                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                                    evFilter === p.key ? 'bg-white/25 text-white' : 'bg-gold-soft text-muted'
                                                }`}>{p.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                            {events && events.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.filter(eventMatchesFilter).map(event => {
                                        const dibayar = terbayarEvent(event);
                                        const dealHarga = Number(event.deal_harga_event) || 0;
                                        const pct   = dealHarga > 0 ? Math.min(100, Math.round((dibayar / dealHarga) * 100)) : 0;
                                        const lunas = dealHarga > 0 && dibayar >= dealHarga;
                                        const sisa  = dealHarga - dibayar;
                                        const acaraOpen = panelOpen(event.id_event, 'acara');
                                        const buktiOpen = panelOpen(event.id_event, 'bukti');
                                        const jmlBukti  = event.bukti_pembayaran?.length ?? 0;
                                        const days  = getDaysUntil(event.tgl_mulai_event);

                                        return (
                                        <Fragment key={event.id_event}>

                                        {/* ── Card ── */}
                                        <div className="flex flex-col overflow-hidden bg-surface border border-line rounded-2xl hover:border-gold-2 transition-colors">

                                            {/* Poster */}
                                            <div className="relative h-36 overflow-hidden flex-shrink-0">
                                                {event.poster_event ? (
                                                    <img src={`/${event.poster_event}`} alt={event.nama_event}
                                                        className="object-cover w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gold-soft via-paper to-surface flex items-center justify-center">
                                                        <span className="text-4xl font-black text-gold/20 select-none">
                                                            {event.nama_event.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />

                                                {/* Status badge */}
                                                <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border backdrop-blur-sm ${getEventStatusColor(event.status_event)}`}>
                                                        {getEventStatusLabel(event.status_event)}
                                                    </span>
                                                    {event.status_event === 'Upcoming' && days !== null && days >= 0 && (
                                                        days === 0
                                                            ? <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500/90 text-ink backdrop-blur-sm animate-pulse">🎉 Hari ini!</span>
                                                            : days <= 7
                                                                ? <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500/90 text-ink backdrop-blur-sm"><Timer size={9} />{days}h lagi</span>
                                                                : days <= 30
                                                                    ? <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gold/90 text-white backdrop-blur-sm"><Timer size={9} />{days}h lagi</span>
                                                                    : null
                                                    )}
                                                </div>

                                                {/* Event name */}
                                                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                                                    <p className="text-sm font-black text-ink leading-tight line-clamp-2 drop-shadow">{event.nama_event}</p>
                                                    {event.kategori_event && (
                                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-gold/90 text-white rounded-full">
                                                            {event.kategori_event}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="flex flex-col flex-1 p-3 gap-2.5">

                                                {/* Quick info — 2 kolom, 2 baris */}
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
                                                        <span className="flex-shrink-0">📅</span>
                                                        <span className="font-medium truncate">{formatTanggal(event.tgl_mulai_event)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
                                                        <span className="flex-shrink-0">📍</span>
                                                        <span className="truncate">{event.area_event || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
                                                        <span className="flex-shrink-0">👥</span>
                                                        <span className="truncate">{event.jumlah_pax ? event.jumlah_pax + ' orang' : '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
                                                        <span className="flex-shrink-0">👤</span>
                                                        <span className="truncate">{event.pic?.nama_pegawai || '-'}</span>
                                                    </div>
                                                </div>

                                                {/* Note pill */}
                                                {event.note_event && (
                                                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-gold-soft border border-line rounded-lg">
                                                        <span className="text-xs flex-shrink-0">📝</span>
                                                        <p className="text-[10px] text-gold/80 line-clamp-2 leading-relaxed">{event.note_event}</p>
                                                    </div>
                                                )}

                                                {/* Payment compact */}
                                                {dealHarga > 0 && (
                                                    <div className="mt-auto pt-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[11px] font-black text-gold-dim">{formatBudget(dealHarga)}</span>
                                                            {lunas ? (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-black text-ok bg-ok-bg border border-ok/30 rounded-full">✓ Lunas</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold text-gold">{pct}%</span>
                                                            )}
                                                        </div>
                                                        <div className="w-full h-1.5 bg-paper rounded-full overflow-hidden">
                                                            <div className="h-1.5 rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                                        </div>
                                                        {!lunas && (
                                                            <p className="mt-1 text-[10px] text-orange-400 font-bold">
                                                                Kekurangan: {formatBudget(sisa)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Aksi: Detail Acara + Pembayaran */}
                                                <div className="flex gap-1.5 mt-auto pt-1">
                                                    <button onClick={() => togglePanel(event.id_event, 'acara')}
                                                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-xl transition-colors border ${
                                                            acaraOpen
                                                                ? 'bg-gold-soft text-ink border-gold-2'
                                                                : 'bg-paper text-muted border-line hover:bg-gold-soft'
                                                        }`}>
                                                        {acaraOpen ? <ChevronUp size={12} /> : <Info size={12} />}
                                                        Detail Acara
                                                    </button>
                                                    <button onClick={() => togglePanel(event.id_event, 'bukti')}
                                                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-xl transition-colors border ${
                                                            buktiOpen
                                                                ? 'bg-gold-soft text-ink border-gold-2'
                                                                : 'bg-paper text-muted border-line hover:bg-gold-soft'
                                                        }`}>
                                                        {buktiOpen ? <ChevronUp size={12} /> : <Wallet size={12} />}
                                                        Pembayaran{jmlBukti > 0 ? ` · ${jmlBukti}` : ''}
                                                    </button>
                                                </div>

                                                {/* Detail event — PDF informasi acara + tagihan */}
                                                <div className="flex gap-1.5 mt-1.5">
                                                    <a href={route('client.event.detail-pdf', event.id_event)}
                                                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-gold-soft text-gold-dim text-[11px] font-bold rounded-xl hover:brightness-95 transition-all border border-gold-2">
                                                        <Download size={12} />
                                                        Unduh PDF Detail Event
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Panel: Detail Acara ── */}
                                        {acaraOpen && (
                                            <div className="col-span-full bg-surface border border-line rounded-2xl p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                                                        <Info size={15} className="text-gold" />
                                                        Detail Acara
                                                        <span className="ml-1 text-xs font-normal text-muted">— {event.nama_event}</span>
                                                    </h4>
                                                    <button onClick={() => setExpandedEvent(null)}
                                                        className="p-1 text-muted hover:text-muted transition-colors">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Detail acara lengkap */}
                                                {(event.deskripsi_event || event.entairtainment_event || event.food_beverage_event || event.technical_meeting || event.gladi_resik) && (
                                                    <div className="mb-4 space-y-3">
                                                        {event.deskripsi_event && (
                                                            <div>
                                                                <p className="text-[10px] font-black text-gold uppercase tracking-wider mb-1">Tentang Acara</p>
                                                                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{event.deskripsi_event}</p>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {event.entairtainment_event && (
                                                                <div className="flex items-start gap-2 p-3 bg-paper rounded-xl">
                                                                    <Music size={14} className="text-gold mt-0.5 shrink-0" />
                                                                    <div className="min-w-0"><p className="text-[10px] font-black text-gold-dim">Entertainment</p><p className="text-xs text-muted">{event.entairtainment_event}</p></div>
                                                                </div>
                                                            )}
                                                            {event.food_beverage_event && (
                                                                <div className="flex items-start gap-2 p-3 bg-paper rounded-xl">
                                                                    <Utensils size={14} className="text-gold mt-0.5 shrink-0" />
                                                                    <div className="min-w-0"><p className="text-[10px] font-black text-gold-dim">Food &amp; Beverage</p><p className="text-xs text-muted">{event.food_beverage_event}</p></div>
                                                                </div>
                                                            )}
                                                            {event.technical_meeting && (
                                                                <div className="flex items-start gap-2 p-3 bg-paper rounded-xl">
                                                                    <Calendar size={14} className="text-gold mt-0.5 shrink-0" />
                                                                    <div className="min-w-0"><p className="text-[10px] font-black text-gold-dim">Technical Meeting</p><p className="text-xs text-muted">{event.technical_meeting}</p></div>
                                                                </div>
                                                            )}
                                                            {event.gladi_resik && (
                                                                <div className="flex items-start gap-2 p-3 bg-paper rounded-xl">
                                                                    <Calendar size={14} className="text-gold mt-0.5 shrink-0" />
                                                                    <div className="min-w-0"><p className="text-[10px] font-black text-gold-dim">Gladi Resik</p><p className="text-xs text-muted">{event.gladi_resik}</p></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Progres persiapan acara — dari papan To-Do internal (read-only) */}
                                                {event.tugas?.length > 0 && (() => {
                                                    const tugas   = event.tugas;
                                                    const total   = tugas.length;
                                                    const selesai = tugas.filter(t => t.status_tugas === 'Done').length;
                                                    const persenSiap = total ? Math.round((selesai / total) * 100) : 0;

                                                    const perKat = {};
                                                    tugas.forEach(t => {
                                                        const k = t.kategori || 'Lainnya';
                                                        if (!perKat[k]) perKat[k] = { total: 0, done: 0, ongoing: 0 };
                                                        perKat[k].total++;
                                                        if (t.status_tugas === 'Done') perKat[k].done++;
                                                        else if ((t.progress || 0) > 0) perKat[k].ongoing++;
                                                    });

                                                    const statusKat = (c) =>
                                                        c.done === c.total ? { label: 'Selesai', cls: 'bg-ok-bg text-ok border-ok/30' }
                                                        : (c.done > 0 || c.ongoing > 0) ? { label: 'Sedang dikerjakan', cls: 'bg-blue-500/10 text-info border-blue-500/30' }
                                                        : { label: 'Menunggu', cls: 'bg-paper text-muted-2 border-line' };

                                                    return (
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[10px] font-black text-gold uppercase tracking-wider">🛠️ Progres Persiapan Acara</p>
                                                                <span className="text-xs font-bold text-gold-dim">{selesai}/{total} tugas · {persenSiap}%</span>
                                                            </div>
                                                            <div className="w-full h-2 mb-3 overflow-hidden rounded-full bg-paper">
                                                                <div className="h-2 transition-all duration-700 rounded-full bg-gold-grad" style={{ width: `${persenSiap}%` }} />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {Object.entries(perKat).map(([kat, c]) => {
                                                                    const s = statusKat(c);
                                                                    return (
                                                                        <div key={kat} className="flex items-center justify-between gap-2 px-3 py-2 bg-paper rounded-lg">
                                                                            <span className="text-xs font-bold truncate text-ink">{kat}</span>
                                                                            <div className="flex items-center flex-shrink-0 gap-2">
                                                                                <span className="text-[10px] text-muted">{c.done}/{c.total}</span>
                                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${s.cls}`}>{s.label}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <p className="mt-2 text-[10px] text-muted-2">Progres ini diperbarui oleh tim kami seiring persiapan acara berjalan.</p>
                                                        </div>
                                                    );
                                                })()}

                                                {(!event.tugas || event.tugas.length === 0) && (
                                                    <p className="text-[11px] text-muted-2">Persiapan acara belum dijadwalkan. Progres akan tampil di sini seiring tim kami mengerjakannya.</p>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Panel: Detail Pembayaran ── */}
                                        {buktiOpen && (
                                            <div className="col-span-full bg-surface border border-line rounded-2xl p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                                                        <Wallet size={15} className="text-gold" />
                                                        Detail Pembayaran
                                                        <span className="ml-1 text-xs font-normal text-muted">— {event.nama_event}</span>
                                                    </h4>
                                                    <button onClick={() => setExpandedEvent(null)}
                                                        className="p-1 text-muted hover:text-muted transition-colors">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Ringkasan angka */}
                                                {dealHarga > 0 && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                                        <div className="p-3 bg-paper rounded-xl">
                                                            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Total Deal</p>
                                                            <p className="text-sm font-black text-gold-dim">{formatBudget(dealHarga)}</p>
                                                        </div>
                                                        <div className="p-3 bg-paper rounded-xl">
                                                            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Terbayar</p>
                                                            <p className="text-sm font-black text-ok">{formatBudget(dibayar)}</p>
                                                        </div>
                                                        <div className="p-3 bg-paper rounded-xl">
                                                            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Kekurangan</p>
                                                            <p className={`text-sm font-black ${lunas ? 'text-ok' : 'text-orange-400'}`}>
                                                                {lunas ? '✓ Lunas' : formatBudget(sisa)}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-paper rounded-xl">
                                                            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Progress</p>
                                                            <div className="w-full h-1.5 bg-gold-soft rounded-full overflow-hidden">
                                                                <div className="h-1.5 rounded-full"
                                                                    style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                                            </div>
                                                            <p className="text-[10px] font-black text-gold-dim mt-0.5">{pct}%</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pengajuan pembatalan + refund acara */}
                                                {event.pembatalan_aktif ? (
                                                    <div className={`mb-4 p-3 rounded-xl border ${event.pembatalan_aktif.status === 'Disetujui' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gold-soft/60 border-gold-2'}`}>
                                                        <p className="text-xs font-bold text-ink">
                                                            {event.pembatalan_aktif.status === 'Disetujui' ? '✅ Pengajuan pembatalan disetujui' : '📩 Pengajuan pembatalan sedang ditinjau'}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-muted">
                                                            {event.pembatalan_aktif.status === 'Disetujui'
                                                                ? 'Manajemen telah menyetujui. Tim Finance akan memproses pengembalian dana Anda.'
                                                                : 'Menunggu persetujuan tim Manajemen kami.'}
                                                        </p>
                                                    </div>
                                                ) : ['Deal', 'Upcoming', 'Penyelesaian'].includes(event.status_event) && (
                                                    <div className="mb-4">
                                                        <button onClick={() => { setPembatalanAlasan(''); setPembatalanModal(event); }}
                                                            className="text-[11px] font-bold text-danger border border-danger/30 px-3 py-1.5 rounded-lg hover:bg-danger-bg transition-colors">
                                                            Ajukan Pembatalan &amp; Refund
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Header bukti + tombol upload */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-black text-gold uppercase tracking-wider">Bukti Pembayaran Diunggah</p>
                                                    <button onClick={() => openUpload(event)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-gold-grad text-white text-[11px] font-bold rounded-lg hover:brightness-95 transition-all shadow-gold">
                                                        <Upload size={12} /> Upload Bukti
                                                    </button>
                                                </div>

                                                {/* Bukti list */}
                                                {event.bukti_pembayaran && event.bukti_pembayaran.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {event.bukti_pembayaran.map(bukti => {
                                                            const ditolak = bukti.status === 'Ditolak' && bukti.catatan_finance;
                                                            return (
                                                            // Bukti yang ditolak melebar penuh agar alasannya lega, tidak berdesakan.
                                                            <div key={bukti.id} className={`p-3 bg-paper rounded-xl ${ditolak ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="flex items-center justify-center w-8 h-8 bg-gold-soft rounded-lg flex-shrink-0">
                                                                            <FileText size={14} className="text-muted" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-ink truncate">
                                                                                {bukti.nominal ? formatBudget(bukti.nominal) : 'Bukti Pembayaran'}
                                                                            </p>
                                                                            <p className="text-[10px] text-muted">
                                                                                {new Date(bukti.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                            </p>
                                                                            {bukti.keterangan && <p className="text-[10px] text-muted truncate">{bukti.keterangan}</p>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${getBuktiStatusColor(bukti.status)}`}>
                                                                            {bukti.status}
                                                                        </span>
                                                                        <a href={`/${bukti.file_bukti}`} target="_blank" rel="noreferrer"
                                                                            title="Lihat bukti"
                                                                            className="p-1 text-muted hover:text-gold-dim transition-colors">
                                                                            <Eye size={13} />
                                                                        </a>
                                                                        {bukti.status === 'Diverifikasi' && (
                                                                            <a href={route('client.bukti.kwitansi', bukti.id)}
                                                                                title="Unduh kwitansi"
                                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-ok bg-ok-bg border border-ok/30 rounded-lg hover:brightness-95 transition-all">
                                                                                <Download size={11} /> Kwitansi
                                                                            </a>
                                                                        )}
                                                                        {bukti.status === 'Menunggu' && (
                                                                            <button onClick={() => handleDeleteBukti(bukti.id)}
                                                                                className="p-1 text-muted hover:text-danger transition-colors">
                                                                                <X size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Alasan penolakan di bawah baris bukti, lega selebar kartu */}
                                                                {ditolak && (
                                                                    <div className="mt-2 px-2.5 py-1.5 bg-danger-bg border border-red-500/20 rounded-lg">
                                                                        <p className="text-[10px] font-bold text-danger mb-0.5">Alasan ditolak Finance:</p>
                                                                        <p className="text-[11px] text-danger/90 leading-relaxed">{bukti.catatan_finance}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center text-muted-2">
                                                        <FileText size={28} className="mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm font-bold">Belum ada bukti pembayaran</p>
                                                    </div>
                                                )}

                                                {/* Tip tindak lanjut — alasannya sudah tampil di tiap bukti di atas,
                                                    jadi di sini cukup ajakan tindak lanjutnya saja (tak diulang). */}
                                                {event.bukti_pembayaran?.some(b => b.status === 'Ditolak') && (
                                                    <p className="mt-3 text-xs text-gold-dim">💡 Ada bukti yang ditolak — hapus bukti tersebut lalu unggah ulang sesuai catatan Finance.</p>
                                                )}
                                            </div>
                                        )}

                                        </Fragment>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center border-2 border-line border-dashed rounded-3xl">
                                    <Calendar size={48} className="mx-auto mb-4 text-muted-2" />
                                    <p className="text-lg font-bold text-muted">Belum ada event</p>
                                    <p className="mt-1 text-sm text-muted-2">Event yang sudah di-deal akan muncul di sini.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: PAYMENTS */}
                    {activeTab === 'payments' && (() => {
                        const sumBayar  = (e) => terbayarEvent(e);
                        const payEvents = (events || []).filter(e => Number(e.deal_harga_event) > 0);
                        const totalTagihan  = payEvents.reduce((s, e) => s + Number(e.deal_harga_event || 0), 0);
                        const totalTerbayar = payEvents.reduce((s, e) => s + sumBayar(e), 0);
                        const totalSisa     = Math.max(0, totalTagihan - totalTerbayar);

                        if (payEvents.length === 0) {
                            return (
                                <div className="py-20 text-center border-2 border-line border-dashed rounded-3xl">
                                    <span className="block mb-4 text-5xl">💳</span>
                                    <p className="text-lg font-bold text-muted">Belum ada tagihan</p>
                                    <p className="mt-1 text-sm text-muted-2">Tagihan muncul setelah event Anda memiliki harga deal.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-4">
                                {/* Ringkasan keuangan */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="p-5 bg-surface border border-line rounded-2xl">
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Tagihan</p>
                                        <p className="text-xl font-black text-gold-dim">{formatBudget(totalTagihan)}</p>
                                    </div>
                                    <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Terbayar</p>
                                        <p className="text-xl font-black text-ok">{formatBudget(totalTerbayar)}</p>
                                    </div>
                                    <div className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Kekurangan</p>
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
                                    const isExpanded = panelOpen(event.id_event, 'bukti');
                                    const buktiList  = event.bukti_pembayaran || [];

                                    return (
                                    <div key={event.id_event} className="p-5 bg-surface border border-line rounded-2xl">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-black text-ink truncate">{event.nama_event}</h3>
                                                <p className="text-xs text-muted mt-0.5">{formatTanggal(event.tgl_mulai_event)}</p>
                                            </div>
                                            {lunas
                                                ? <span className="px-2 py-1 text-[10px] font-black text-ok bg-ok-bg border border-ok/30 rounded-full flex-shrink-0">✓ LUNAS</span>
                                                : <span className="px-2 py-1 text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full flex-shrink-0">{pct}%</span>
                                            }
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div>
                                                <p className="text-[10px] text-muted uppercase tracking-wider">Total</p>
                                                <p className="text-sm font-bold text-gold-dim">{formatBudget(dealHarga)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted uppercase tracking-wider">Terbayar</p>
                                                <p className="text-sm font-bold text-ok">{formatBudget(dibayar)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted uppercase tracking-wider">Kekurangan</p>
                                                <p className={`text-sm font-bold ${lunas ? 'text-ok' : 'text-orange-400'}`}>{lunas ? '✓' : formatBudget(sisa)}</p>
                                            </div>
                                        </div>

                                        <div className="w-full h-2 mb-3 overflow-hidden bg-paper rounded-full">
                                            <div className="h-2 rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: lunas ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316' }} />
                                        </div>

                                        {/* Invoice dari Finance — bisa diunduh & jadi acuan pembayaran */}
                                        {(event.invoices || []).length > 0 && (
                                            <div className="mb-3 space-y-1.5">
                                                {event.invoices.map(inv => (
                                                    <div key={inv.id_invoice} className="flex items-center justify-between gap-2 p-2.5 bg-paper border border-line rounded-xl">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileText size={14} className="flex-shrink-0 text-gold-dim" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-ink truncate">
                                                                    Invoice {inv.tipe} · {formatBudget(inv.nominal)}
                                                                </p>
                                                                <p className="text-[10px] text-muted truncate">
                                                                    {inv.nomor_invoice}
                                                                    {inv.tgl_jatuh_tempo && inv.status !== 'Lunas' && (
                                                                        <span className="ml-1 text-orange-400">· jatuh tempo {new Date(inv.tgl_jatuh_tempo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                                                inv.status === 'Lunas'
                                                                    ? 'text-ok bg-ok-bg border-ok/30'
                                                                    : 'text-red-500 bg-red-500/10 border-red-500/30'
                                                            }`}>{inv.status}</span>
                                                            <a href={route('client.invoice.pdf', inv.id_invoice)}
                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gold-dim transition-colors border bg-gold-soft border-gold-2 rounded-lg hover:brightness-95">
                                                                <Download size={11} /> PDF
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sudah Deal tapi invoice belum terbit — beri kejelasan, jangan biarkan menggantung */}
                                        {(event.invoices || []).length === 0 && event.status_event === 'Deal' && (
                                            <div className="flex items-start gap-2 p-3 mb-3 border bg-gold-soft/50 border-gold-2 rounded-xl">
                                                <Clock size={14} className="text-gold-dim mt-0.5 shrink-0" />
                                                <p className="text-xs text-muted">
                                                    <span className="font-bold text-gold-dim">Penawaran Anda sudah kami terima.</span> Tim Finance sedang menyiapkan
                                                    invoice uang muka. Invoice akan muncul di sini begitu diterbitkan.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button onClick={() => openUpload(event)}
                                                className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-gold-dim transition-colors border bg-gold-soft rounded-xl hover:bg-gold-soft border-gold-2">
                                                <Upload size={13} /> Upload Bukti
                                            </button>
                                            <button onClick={() => togglePanel(event.id_event, 'bukti')}
                                                className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-muted transition-colors bg-paper border border-line rounded-xl hover:bg-gold-soft">
                                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                {buktiList.length} Bukti
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="pt-3 mt-3 border-t border-line">
                                                {buktiList.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {buktiList.map(bukti => (
                                                            <div key={bukti.id} className="flex items-center justify-between p-2.5 bg-paper rounded-xl">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <FileText size={14} className="flex-shrink-0 text-muted" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-ink truncate">{bukti.nominal ? formatBudget(bukti.nominal) : 'Bukti'}</p>
                                                                        <p className="text-[10px] text-muted">{new Date(bukti.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${getBuktiStatusColor(bukti.status)}`}>{bukti.status}</span>
                                                                    <a href={`/${bukti.file_bukti}`} target="_blank" rel="noreferrer" title="Lihat bukti" className="p-1 text-muted transition-colors hover:text-gold-dim"><Eye size={13} /></a>
                                                                    {bukti.status === 'Diverifikasi' && (
                                                                        <a href={route('client.bukti.kwitansi', bukti.id)} title="Unduh kwitansi" className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-ok bg-ok-bg border border-ok/30 rounded-lg transition-all hover:brightness-95"><Download size={11} /> Kwitansi</a>
                                                                    )}
                                                                    {bukti.status === 'Menunggu' && (
                                                                        <button onClick={() => handleDeleteBukti(bukti.id)} className="p-1 text-muted transition-colors hover:text-danger"><X size={13} /></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-4 text-sm text-center text-muted-2">Belum ada bukti pembayaran</p>
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

            {/* Modal ajukan penyesuaian penawaran (negosiasi lanjutan) */}
            {penyesuaianModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
                    onClick={() => !prosesPenawaran && setPenyesuaianModal(null)}>
                    <div className="w-full max-w-md p-6 border shadow-xl bg-surface border-line rounded-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <h2 className="text-lg font-extrabold text-ink">💬 Ajukan Penyesuaian</h2>
                            <button onClick={() => !prosesPenawaran && setPenyesuaianModal(null)}
                                className="p-1.5 text-muted hover:bg-paper rounded-lg"><X size={18} /></button>
                        </div>
                        <p className="mb-4 text-sm text-muted">
                            Untuk penawaran <span className="font-bold text-ink">"{penyesuaianModal.nama_event}"</span>.
                            Sampaikan bagian yang ingin disesuaikan atau ditambahkan. Penawaran tidak ditolak — tim kami akan menindaklanjuti.
                        </p>
                        <label className="block mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">
                            Yang ingin disesuaikan <span className="text-danger normal-case font-normal">* wajib</span>
                        </label>
                        <textarea value={penyesuaianPesan} onChange={e => setPenyesuaianPesan(e.target.value)} rows={4} maxLength={1000}
                            placeholder="Mis. tambah dekorasi panggung, ubah menu F&B, kurangi jumlah tamu, sesuaikan harga…"
                            className="w-full px-3 py-2 text-sm border bg-surface border-line rounded-xl text-ink placeholder-muted-2 focus:border-gold-2 focus:outline-none" />
                        <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer text-muted">
                            <input type="checkbox" checked={penyesuaianMeeting} onChange={e => setPenyesuaianMeeting(e.target.checked)}
                                className="w-4 h-4 rounded accent-gold-dim" />
                            Saya ingin dijadwalkan meeting ulang untuk membahas
                        </label>
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setPenyesuaianModal(null)} disabled={prosesPenawaran}
                                className="px-4 py-2 text-sm font-bold text-muted transition-colors bg-paper border border-line rounded-xl hover:bg-gold-soft disabled:opacity-60">
                                Batal
                            </button>
                            <button onClick={submitPenyesuaian} disabled={prosesPenawaran || penyesuaianPesan.trim().length < 5}
                                className="px-4 py-2 text-sm font-black text-white transition-all bg-gold-grad shadow-gold rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
                                {prosesPenawaran === penyesuaianModal.id_event ? 'Mengirim…' : 'Kirim Permintaan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cancel Appointment */}
            {/* Modal tolak penawaran */}
            {tolakModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
                    onClick={() => !prosesPenawaran && setTolakModal(null)}>
                    <div className="w-full max-w-md p-6 border shadow-xl bg-surface border-line rounded-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <XCircle size={20} className="text-danger" />
                                <h2 className="text-lg font-extrabold text-ink">Tolak Penawaran</h2>
                            </div>
                            <button onClick={() => !prosesPenawaran && setTolakModal(null)}
                                className="p-1.5 text-muted hover:bg-paper rounded-lg"><X size={18} /></button>
                        </div>
                        <p className="mb-4 text-sm text-muted">
                            Menolak penawaran <span className="font-bold text-ink">"{tolakModal.nama_event}"</span>?
                            Tim kami akan diberi tahu untuk menindaklanjuti.
                        </p>
                        <label className="block mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">
                            Alasan <span className="font-medium normal-case text-muted-2">(opsional)</span>
                        </label>
                        <textarea value={alasanTolak} onChange={e => setAlasanTolak(e.target.value)} rows={3} maxLength={500}
                            placeholder="Mis. harga di atas budget, tanggal berubah, memilih vendor lain…"
                            className="w-full px-3 py-2 text-sm border bg-surface border-line rounded-xl text-ink placeholder-muted-2 focus:border-gold-2 focus:outline-none" />
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setTolakModal(null)} disabled={prosesPenawaran}
                                className="px-4 py-2 text-sm font-bold text-muted transition-colors bg-paper border border-line rounded-xl hover:bg-gold-soft disabled:opacity-60">
                                Batal
                            </button>
                            <button onClick={submitTolakPenawaran} disabled={prosesPenawaran}
                                className="px-4 py-2 text-sm font-bold text-white transition-colors bg-danger rounded-xl hover:brightness-110 disabled:opacity-60">
                                {prosesPenawaran ? 'Menyimpan…' : 'Ya, tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-surface border border-line shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-ink">Batalkan Appointment</h2>
                                <p className="text-xs text-muted mt-0.5">{cancelModal.jenis_event}</p>
                            </div>
                            <button onClick={() => setCancelModal(null)}
                                className="p-1.5 text-muted hover:bg-paper rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 mb-4 bg-danger-bg border border-red-500/20 rounded-xl">
                            <p className="text-xs text-danger font-bold">⚠️ Perhatian</p>
                            <p className="text-xs text-red-300 mt-1">Appointment yang dibatalkan tidak dapat dikembalikan. Tim kami akan menerima notifikasi pembatalan ini.</p>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">
                                Alasan Pembatalan <span className="text-danger normal-case font-normal">* wajib isi</span>
                            </label>
                            <textarea
                                rows={3}
                                value={alasanBatal}
                                onChange={e => setAlasanBatal(e.target.value)}
                                placeholder="Jelaskan alasan pembatalan (min. 5 karakter)..."
                                className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line resize-none rounded-xl focus:border-red-500 focus:outline-none"
                            />
                            <div className="flex items-center justify-between mt-1">
                                {alasanBatal.trim().length > 0 && alasanBatal.trim().length < 5
                                    ? <p className="text-[10px] text-danger">⚠ Minimal 5 karakter</p>
                                    : <span />
                                }
                                <p className="text-[10px] text-muted-2">{alasanBatal.length}/500</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal(null)}
                                className="flex-1 py-2.5 border border-line text-muted font-bold rounded-xl hover:bg-paper transition-colors text-sm">
                                Kembali
                            </button>
                            <button
                                onClick={submitCancel}
                                disabled={cancelLoading || !alasanBatal.trim() || alasanBatal.trim().length < 5}
                                className="flex-1 py-2.5 bg-red-500 text-ink font-black rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {cancelLoading ? 'Memproses...' : 'Ya, Batalkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Usulan Jadwal (reschedule dua arah) */}
            {usulModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md p-6 bg-surface border border-line shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-ink">Usulkan Jadwal Lain</h2>
                                <p className="text-xs text-muted mt-0.5">{usulModal.jenis_event}</p>
                            </div>
                            <button onClick={() => setUsulModal(null)} className="p-1.5 text-muted hover:bg-paper rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="p-3 mb-4 text-xs text-muted bg-gold-soft/60 border border-gold-2 rounded-xl">
                            Ajukan tanggal & jam yang lebih pas untukmu. Jadwal yang berlaku sekarang tetap sama sampai tim kami meninjau dan mengonfirmasi usulanmu.
                        </p>

                        <form onSubmit={submitUsul} className="space-y-4">
                            {usulErrors.message && (
                                <p className="px-3 py-2 text-xs font-bold text-danger bg-danger-bg border border-red-500/20 rounded-xl">{usulErrors.message}</p>
                            )}
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Tanggal Usulan *</label>
                                <input type="date"
                                    value={usulForm.usulan_tgl}
                                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                                    onChange={e => setUsulForm(f => ({ ...f, usulan_tgl: e.target.value }))}
                                    className={`w-full px-4 py-3 text-sm text-ink bg-surface border rounded-xl focus:outline-none ${usulErrors.usulan_tgl ? 'border-red-500 focus:border-red-500' : 'border-line focus:border-gold-2'}`} />
                                {usulErrors.usulan_tgl && <p className="mt-1 text-[11px] text-danger">{usulErrors.usulan_tgl}</p>}
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Jam Usulan *</label>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                    {slots.map(s => (
                                        <button type="button" key={s}
                                            onClick={() => setUsulForm(f => ({ ...f, usulan_jam: s }))}
                                            className={`py-2 text-xs font-bold border rounded-xl transition-all ${
                                                usulForm.usulan_jam === s
                                                    ? 'bg-gold-grad text-white border-transparent shadow-gold'
                                                    : 'bg-surface border-line text-ink hover:border-gold-2'
                                            }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {usulErrors.usulan_jam && <p className="mt-1 text-[11px] text-danger">{usulErrors.usulan_jam}</p>}
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Catatan <span className="normal-case font-normal text-muted-2">(opsional)</span></label>
                                <textarea rows={2}
                                    value={usulForm.usulan_catatan}
                                    onChange={e => setUsulForm(f => ({ ...f, usulan_catatan: e.target.value }))}
                                    placeholder="Mis. lebih nyaman sore hari…"
                                    className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line resize-none rounded-xl focus:border-gold-2 focus:outline-none" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setUsulModal(null)}
                                    className="flex-1 py-2.5 border border-line text-muted font-bold rounded-xl hover:bg-paper transition-colors text-sm">
                                    Kembali
                                </button>
                                <button type="submit"
                                    disabled={usulLoading || !usulForm.usulan_tgl || !usulForm.usulan_jam}
                                    className="flex-1 py-2.5 bg-gold-grad text-white font-black rounded-xl hover:brightness-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {usulLoading ? 'Mengirim…' : 'Kirim Usulan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Ajukan Pembatalan & Refund */}
            {pembatalanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-surface border border-line shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-ink">Ajukan Pembatalan &amp; Refund</h2>
                                <p className="text-xs text-muted mt-0.5">{pembatalanModal.nama_event}</p>
                            </div>
                            <button onClick={() => setPembatalanModal(null)} className="p-1.5 text-muted hover:bg-paper rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 mb-4 text-xs border bg-gold-soft/60 border-gold-2 rounded-xl text-muted">
                            Pengajuan ini akan <b className="text-ink">ditinjau tim Manajemen</b> terlebih dahulu. Bila disetujui,
                            tim <b className="text-ink">Finance</b> memproses pengembalian dana. Acara <b className="text-ink">belum</b> dibatalkan
                            sampai proses tersebut selesai.
                        </div>

                        <form onSubmit={submitPembatalan}>
                            <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">
                                Alasan pembatalan <span className="text-danger normal-case font-normal">* wajib</span>
                            </label>
                            <textarea rows={3} value={pembatalanAlasan} onChange={(e) => setPembatalanAlasan(e.target.value)}
                                placeholder="Jelaskan alasan pembatalan (min. 10 karakter)…"
                                className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line resize-none rounded-xl focus:border-gold-2 focus:outline-none" />
                            <div className="flex justify-end mt-1">
                                <p className="text-[10px] text-muted-2">{pembatalanAlasan.length}/1000</p>
                            </div>
                            <div className="flex gap-3 mt-3">
                                <button type="button" onClick={() => setPembatalanModal(null)}
                                    className="flex-1 py-2.5 border border-line text-muted font-bold rounded-xl hover:bg-paper transition-colors text-sm">
                                    Kembali
                                </button>
                                <button type="submit" disabled={pembatalanLoading || pembatalanAlasan.trim().length < 10}
                                    className="flex-1 py-2.5 bg-danger text-white font-black rounded-xl hover:brightness-110 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {pembatalanLoading ? 'Mengirim…' : 'Kirim Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Upload Bukti */}
            {uploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-surface border border-line shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-ink">Upload Bukti Pembayaran</h2>
                                <p className="text-xs text-muted mt-0.5">{uploadModal.nama_event}</p>
                            </div>
                            <button onClick={tutupUpload}
                                className="p-1.5 text-muted hover:bg-paper rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="space-y-4">
                            {/* Tagihan yang dibayar — bukti menempel di sini, sehingga
                                Finance tahu persis pembayaran ini untuk tagihan mana. */}
                            {(uploadModal.invoices || []).length > 0 && (
                                <div>
                                    <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">
                                        Untuk Tagihan
                                    </label>
                                    <select
                                        value={data.id_invoice}
                                        onChange={e => {
                                            const inv = (uploadModal.invoices || []).find(i => String(i.id_invoice) === e.target.value);
                                            setData(d => ({ ...d, id_invoice: e.target.value, nominal: inv ? inv.nominal : d.nominal }));
                                        }}
                                        className="w-full px-4 py-3 text-sm text-ink bg-surface border border-line rounded-xl focus:border-gold"
                                    >
                                        <option value="">— Pilih tagihan —</option>
                                        {uploadModal.invoices.map(inv => (
                                            <option key={inv.id_invoice} value={inv.id_invoice}>
                                                {inv.tipe} · {inv.nomor_invoice} · Rp {Number(inv.nominal).toLocaleString('id-ID')}
                                                {inv.status === 'Lunas' ? ' (lunas)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.id_invoice && <p className="mt-1 text-xs text-danger">{errors.id_invoice}</p>}
                                </div>
                            )}
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">
                                    File Bukti * (JPG, PNG, PDF — max 5MB)
                                </label>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={pilihFileBukti}
                                    className="w-full px-4 py-3 text-sm text-ink bg-surface border border-line rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-gold file:text-white" />
                                {/* Peringatan langsung saat file dipilih */}
                                {buktiWarning && (
                                    <p className="mt-2 px-3 py-2 text-xs font-bold text-danger bg-danger-bg border border-red-500/20 rounded-lg">⚠ {buktiWarning}</p>
                                )}
                                {buktiPreview && !buktiWarning && (
                                    <div className="mt-2">
                                        <img src={buktiPreview} alt="Pratinjau bukti" className="max-h-40 rounded-lg border border-line" />
                                        <p className="mt-1 text-[10px] text-muted-2">Pastikan nominal &amp; keterangan transaksi terbaca jelas. Isi bukti diverifikasi tim Finance.</p>
                                    </div>
                                )}
                                {data.file_bukti && data.file_bukti.type === 'application/pdf' && !buktiWarning && (
                                    <p className="mt-2 text-[11px] text-muted">📄 {data.file_bukti.name} siap diunggah.</p>
                                )}
                                {errors.file_bukti && <p className="mt-1 text-xs text-danger">{errors.file_bukti}</p>}
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Nominal Pembayaran</label>
                                <RupiahInput value={data.nominal}
                                    onChange={v => setData('nominal', v)}
                                    placeholder="Contoh: 5.000.000"
                                    className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line rounded-xl focus:border-gold" />
                            </div>
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Keterangan</label>
                                <textarea rows={3} value={data.keterangan}
                                    onChange={e => setData('keterangan', e.target.value)}
                                    placeholder="Contoh: DP 50%, transfer BCA"
                                    className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line resize-none rounded-xl focus:border-gold" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={tutupUpload}
                                    className="flex-1 py-2.5 border border-line text-muted font-bold rounded-xl hover:bg-paper">
                                    Batal
                                </button>
                                <button type="submit" disabled={processing || !!buktiWarning}
                                    className="flex-1 py-2.5 bg-gold-grad shadow-gold text-white font-black rounded-xl hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {processing ? 'Mengupload...' : '📤 Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus Bukti */}
            {deleteBuktiId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-surface border border-line shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-danger-bg">
                            <span className="text-3xl">🗑️</span>
                        </div>
                        <h2 className="mb-2 text-lg font-extrabold text-center text-ink">Hapus Bukti Pembayaran?</h2>
                        <p className="mb-6 text-sm text-center text-muted">Bukti yang dihapus tidak bisa dikembalikan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteBuktiId(null)}
                                className="flex-1 py-2.5 border border-line text-muted font-bold rounded-xl hover:bg-paper transition-colors">
                                Batal
                            </button>
                            <button onClick={confirmDeleteBukti} disabled={deletingBukti}
                                className="flex-1 py-2.5 bg-red-500 text-ink font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">
                                {deletingBukti ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
