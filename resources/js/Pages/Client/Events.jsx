import { Head, router, Link } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import {
    ChevronDown, Phone, Mail, MapPin, Menu, X,
    Home as HomeIcon, Calendar, LogOut, Search,
    Clock, Users, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Events({ events, kategoris, filters, isLoggedIn, auth }) {
    const BASE_URL = window.location.origin;

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen]     = useState(false);
    const [selectedEvent, setSelectedEvent]   = useState(null);

    // Filter state — initialised from server-side filters
    const [search, setSearch]           = useState(filters?.search || '');
    const [activeKategori, setActiveKategori] = useState(filters?.kategori || 'all');
    const [activeStatus, setActiveStatus]     = useState(filters?.status   || 'all');

    const statusTabs = [
        { key: 'all',      label: 'Semua' },
        { key: 'Upcoming',   label: 'Upcoming' },
        { key: 'Done',     label: 'Selesai' },
    ];

    // Trigger server-side filter
    const applyFilter = useCallback((overrides = {}) => {
        const params = {
            search:   overrides.search   !== undefined ? overrides.search   : search,
            kategori: overrides.kategori !== undefined ? overrides.kategori : (activeKategori !== 'all' ? activeKategori : ''),
            status:   overrides.status   !== undefined ? overrides.status   : (activeStatus   !== 'all' ? activeStatus   : ''),
        };
        // Remove empty params
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('client.events'), params, { preserveState: true, replace: true });
    }, [search, activeKategori, activeStatus]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => applyFilter({ search }), 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line

    const handleKategori = (val) => {
        setActiveKategori(val);
        applyFilter({ kategori: val !== 'all' ? val : '' });
    };

    const handleStatus = (val) => {
        setActiveStatus(val);
        applyFilter({ status: val !== 'all' ? val : '' });
    };

    const eventsData = events?.data ?? [];
    const allKategoris = ['all', ...(kategoris || [])];

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        if (status === 'Done')      return { label: 'Selesai',   cls: 'bg-green-500/20 text-green-400 border-green-500/30' };
        if (status === 'Upcoming')    return { label: 'Upcoming',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        if (status === 'Pending')   return { label: 'Pending',   cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
        if (status === 'Cancelled') return { label: 'Dibatalkan',cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
        return { label: status || '-', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    };

    const getCategoryIcon = (kategori) => {
        const map = {
            'Corporate Event': '🏢', 'Wedding': '💍', 'Wedding & Gala': '💍',
            'Music & Concert': '🎵', 'Concert': '🎵', 'Exhibition': '🎪',
            'Sports Event': '🏆', 'Private Party': '🎉',
        };
        return map[kategori] || '🎊';
    };

    return (
        <>
            <Head title="Events - Laksamana Muda" />

            {/* ── NAVBAR ────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-black/95 backdrop-blur-md border-yellow-500/20">
                <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
                    <a href={`${BASE_URL}/`} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-black border-2 border-yellow-500 rounded-full">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-8 h-8" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-white">
                            Laksamana <span className="text-yellow-500">Muda</span>
                        </span>
                    </a>

                    <div className="items-center hidden gap-8 md:flex">
                        <a href={`${BASE_URL}/`} className="text-sm font-medium text-gray-300 transition-colors hover:text-yellow-400">Home</a>
                        <a href={`${BASE_URL}/events`} className="text-sm font-bold text-yellow-400 border-b-2 border-yellow-500 pb-0.5">Events</a>
                    </div>

                    <div className="items-center hidden gap-3 md:flex">
                        {isLoggedIn ? (
                            <div className="relative">
                                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-4 py-2 transition-colors border rounded-full bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20">
                                    <div className="flex items-center justify-center w-6 h-6 text-xs font-black text-black bg-yellow-500 rounded-full">
                                        {auth?.user?.nama_client?.substring(0, 1).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-bold text-yellow-400">{auth?.user?.nama_client?.split(' ')[0]}</span>
                                    <ChevronDown size={14} className={`text-yellow-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 w-52 overflow-hidden bg-gray-900 border border-gray-700 shadow-xl top-12 rounded-2xl">
                                        <div className="p-3 border-b border-gray-800">
                                            <p className="text-xs font-bold text-white truncate">{auth?.user?.nama_client}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{auth?.user?.email_client}</p>
                                        </div>
                                        <a href={`${BASE_URL}/dashboard`} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-yellow-500/10 hover:text-yellow-400">
                                            <HomeIcon size={14} /> Dashboard
                                        </a>
                                        <a href={`${BASE_URL}/appointment/create`} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-yellow-500/10 hover:text-yellow-400">
                                            <Calendar size={14} /> Buat Appointment
                                        </a>
                                        <button onClick={() => router.post(route('client.logout'))}
                                            className="flex items-center w-full gap-2 px-4 py-3 text-sm text-red-400 transition-colors border-t border-gray-800 hover:bg-red-500/10">
                                            <LogOut size={14} /> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <a href={`${BASE_URL}/login`} className="px-4 py-2 text-sm font-bold text-yellow-400 transition-colors border rounded-full border-yellow-500/50 hover:bg-yellow-500/10">Masuk</a>
                                <a href={`${BASE_URL}/register`} className="px-5 py-2 text-sm font-black text-black transition-colors bg-yellow-500 rounded-full hover:bg-yellow-400">Daftar</a>
                            </>
                        )}
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white md:hidden">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="px-6 py-4 space-y-3 bg-black border-t md:hidden border-yellow-500/20">
                        <a href={`${BASE_URL}/`} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-300 hover:text-yellow-400">Home</a>
                        <a href={`${BASE_URL}/events`} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-bold text-yellow-400">Events</a>
                        <div className="pt-3 space-y-2 border-t border-gray-800">
                            {isLoggedIn ? (
                                <>
                                    <a href={`${BASE_URL}/dashboard`} className="flex items-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-yellow-400 bg-yellow-500/10 rounded-xl">
                                        <HomeIcon size={14} /> Dashboard
                                    </a>
                                    <button onClick={() => router.post(route('client.logout'))}
                                        className="flex items-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-red-400 bg-red-500/10 rounded-xl">
                                        <LogOut size={14} /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-3">
                                    <a href={`${BASE_URL}/login`} className="flex-1 py-2 text-sm font-bold text-center text-yellow-400 border rounded-full border-yellow-500/50">Masuk</a>
                                    <a href={`${BASE_URL}/register`} className="flex-1 py-2 text-sm font-black text-center text-black bg-yellow-500 rounded-full">Daftar</a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO BANNER ───────────────────────────────────────── */}
            <section className="relative flex items-end pt-28 pb-14 overflow-hidden bg-black min-h-[260px]">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #F59E0B 0%, transparent 60%)' }} />
                <div className="relative z-10 px-6 mx-auto max-w-7xl w-full">
                    <p className="text-yellow-500 font-bold tracking-[0.3em] text-xs uppercase mb-3">Portfolio & Galeri</p>
                    <h1 className="text-4xl font-black text-white md:text-5xl">
                        Semua <span className="text-yellow-500">Event</span>
                    </h1>
                    <p className="mt-3 text-gray-400 max-w-xl text-sm leading-relaxed">
                        Jelajahi seluruh event yang telah dan akan diselenggarakan oleh Laksamana Muda.
                    </p>
                    {events?.total != null && (
                        <p className="mt-3 text-xs text-gray-600">
                            <span className="font-bold text-yellow-500">{events.total}</span> event tersedia
                        </p>
                    )}
                </div>
            </section>

            {/* ── FILTER BAR ────────────────────────────────────────── */}
            <section className="sticky top-[73px] z-40 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
                <div className="px-6 py-4 mx-auto max-w-7xl">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Status Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {statusTabs.map(tab => (
                                <button key={tab.key} onClick={() => handleStatus(tab.key)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        activeStatus === tab.key
                                            ? 'bg-yellow-500 text-black border-yellow-500 shadow-sm shadow-yellow-500/20'
                                            : 'text-gray-400 border-gray-700 hover:border-yellow-500/50 hover:text-yellow-400'
                                    }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search + Kategori */}
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Search size={13} className="absolute text-gray-500 left-3 top-2.5" />
                                <input type="text" placeholder="Cari event..." value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 text-xs bg-gray-900 border border-gray-700 rounded-xl text-gray-300 focus:border-yellow-500 focus:outline-none w-full sm:w-44 transition-colors" />
                            </div>
                            <select value={activeKategori} onChange={e => handleKategori(e.target.value)}
                                className="px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded-xl text-gray-300 focus:border-yellow-500 focus:outline-none transition-colors">
                                {allKategoris.map(k => (
                                    <option key={k} value={k}>{k === 'all' ? 'Semua Kategori' : k}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── EVENT GRID ────────────────────────────────────────── */}
            <section className="py-14 bg-gray-950 min-h-screen">
                <div className="px-6 mx-auto max-w-7xl">

                    {eventsData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {eventsData.map(event => {
                                    const badge = getStatusBadge(event.status_event);
                                    return (
                                        <article key={event.id_event}
                                            onClick={() => setSelectedEvent(event)}
                                            className="relative overflow-hidden transition-all duration-300 bg-gray-900 border border-gray-800 cursor-pointer group rounded-2xl hover:border-yellow-500/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-yellow-500/10">

                                            {/* ── Image ── */}
                                            <div className="relative overflow-hidden h-64">
                                                {event.poster_event ? (
                                                    <img src={`/${event.poster_event}`} alt={event.nama_event}
                                                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-yellow-500/10 via-gray-800 to-gray-900">
                                                        <span className="text-5xl mb-2">{getCategoryIcon(event.kategori_event)}</span>
                                                        <span className="text-lg font-black text-yellow-500/30">
                                                            {event.nama_event.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

                                                {/* Top badges */}
                                                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                                                    {event.kategori_event && (
                                                        <span className="px-2.5 py-1 text-[10px] font-black bg-black/60 backdrop-blur-sm text-yellow-400 rounded-full border border-yellow-500/30">
                                                            {getCategoryIcon(event.kategori_event)} {event.kategori_event}
                                                        </span>
                                                    )}
                                                    <span className={`ml-auto px-2.5 py-1 text-[10px] font-black rounded-full border ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>

                                                {/* Bottom overlay: date + location */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="mb-1.5 text-base font-black text-white line-clamp-2 leading-snug group-hover:text-yellow-400 transition-colors">
                                                        {event.nama_event}
                                                    </h3>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-300">
                                                            <Calendar size={10} className="text-yellow-500" />
                                                            {new Date(event.tgl_mulai_event).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {event.jam_mulai && (
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-300">
                                                                <Clock size={10} className="text-yellow-500" />
                                                                {event.jam_mulai}
                                                            </span>
                                                        )}
                                                        {event.area_event && (
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-300">
                                                                <MapPin size={10} className="text-yellow-500" />
                                                                {event.area_event}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Hover CTA */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                                                    <span className="px-5 py-2 text-sm font-black text-black bg-yellow-500 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                                        Lihat Detail →
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ── Card Footer ── */}
                                            {event.jumlah_pax && (
                                                <div className="flex items-center gap-1.5 px-4 py-3 border-t border-gray-800">
                                                    <Users size={12} className="text-gray-500" />
                                                    <span className="text-[11px] text-gray-500">{event.jumlah_pax} tamu</span>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>

                            {/* ── Pagination ── */}
                            {events?.last_page > 1 && (
                                <div className="flex flex-col items-center gap-3 mt-12 sm:flex-row sm:justify-between">
                                    <p className="text-xs text-gray-500">
                                        Menampilkan <span className="font-bold text-gray-300">{events.from}–{events.to}</span> dari{' '}
                                        <span className="font-bold text-yellow-400">{events.total}</span> event
                                    </p>
                                    <div className="flex items-center gap-1">
                                        {/* Prev */}
                                        {events.links[0]?.url ? (
                                            <a href={events.links[0].url}
                                                className="flex items-center justify-center w-9 h-9 text-gray-400 bg-gray-900 border border-gray-700 rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-400 transition-all">
                                                <ChevronLeft size={16} />
                                            </a>
                                        ) : (
                                            <span className="flex items-center justify-center w-9 h-9 text-gray-700 bg-gray-900/50 border border-gray-800 rounded-xl cursor-not-allowed">
                                                <ChevronLeft size={16} />
                                            </span>
                                        )}

                                        {/* Page numbers */}
                                        {events.links.slice(1, -1).map((link, i) => (
                                            link.label === '...' ? (
                                                <span key={'ellipsis-' + i} className="flex items-center justify-center w-9 h-9 text-xs text-gray-600">…</span>
                                            ) : link.url ? (
                                                <a key={link.label + '-' + i} href={link.url}
                                                    className={`flex items-center justify-center w-9 h-9 text-xs font-bold rounded-xl border transition-all ${
                                                        link.active
                                                            ? 'bg-yellow-500 text-black border-yellow-500 shadow-sm shadow-yellow-500/30'
                                                            : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-400'
                                                    }`}>
                                                    {link.label}
                                                </a>
                                            ) : (
                                                <span key={link.label + '-disabled-' + i}
                                                    className="flex items-center justify-center w-9 h-9 text-xs font-bold text-gray-600 bg-gray-900/50 border border-gray-800 rounded-xl">
                                                    {link.label}
                                                </span>
                                            )
                                        ))}

                                        {/* Next */}
                                        {events.links[events.links.length - 1]?.url ? (
                                            <a href={events.links[events.links.length - 1].url}
                                                className="flex items-center justify-center w-9 h-9 text-gray-400 bg-gray-900 border border-gray-700 rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-400 transition-all">
                                                <ChevronRight size={16} />
                                            </a>
                                        ) : (
                                            <span className="flex items-center justify-center w-9 h-9 text-gray-700 bg-gray-900/50 border border-gray-800 rounded-xl cursor-not-allowed">
                                                <ChevronRight size={16} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="flex items-center justify-center w-24 h-24 mb-6 text-4xl bg-gray-900 border border-gray-800 rounded-full">🎪</div>
                            <h3 className="mb-2 text-lg font-bold text-gray-400">Tidak ada event ditemukan</h3>
                            <p className="text-sm text-gray-600">Coba ubah filter atau kata kunci pencarian.</p>
                            {(search || activeStatus !== 'all' || activeKategori !== 'all') && (
                                <button onClick={() => { setSearch(''); setActiveStatus('all'); setActiveKategori('all'); applyFilter({ search: '', status: '', kategori: '' }); }}
                                    className="mt-4 px-5 py-2 text-sm font-bold text-yellow-400 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/10 transition-colors">
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── MODAL DETAIL ──────────────────────────────────────── */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}>
                    <div className="bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700"
                        onClick={e => e.stopPropagation()}>

                        {/* Poster — taller modal */}
                        <div className="relative h-64 overflow-hidden rounded-t-3xl flex-shrink-0">
                            {selectedEvent.poster_event ? (
                                <img src={`/${selectedEvent.poster_event}`} alt={selectedEvent.nama_event}
                                    className="object-cover w-full h-full" />
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-yellow-500/20 to-gray-800">
                                    <span className="text-5xl mb-2">{getCategoryIcon(selectedEvent.kategori_event)}</span>
                                    <span className="text-4xl font-black text-yellow-500/30">{selectedEvent.nama_event.substring(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent" />
                            <button onClick={() => setSelectedEvent(null)}
                                className="absolute flex items-center justify-center w-9 h-9 transition-colors bg-black/60 backdrop-blur-sm rounded-full top-4 right-4 hover:bg-black border border-white/10">
                                <X size={16} className="text-white" />
                            </button>
                            {/* Status + Kategori at bottom */}
                            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                                <div>
                                    {selectedEvent.kategori_event && (
                                        <span className="inline-block mb-1.5 px-2.5 py-0.5 bg-black/60 backdrop-blur-sm text-yellow-400 text-[10px] font-black uppercase rounded-full border border-yellow-500/30">
                                            {getCategoryIcon(selectedEvent.kategori_event)} {selectedEvent.kategori_event}
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const badge = getStatusBadge(selectedEvent.status_event);
                                    return (
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${badge.cls}`}>
                                            {badge.label}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h2 className="mb-4 text-xl font-extrabold text-white leading-snug">{selectedEvent.nama_event}</h2>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    { label: 'Tanggal',   value: formatTanggal(selectedEvent.tgl_mulai_event), icon: <Calendar size={13} className="text-yellow-500" /> },
                                    { label: 'Jam',       value: selectedEvent.jam_mulai && selectedEvent.jam_selesai ? `${selectedEvent.jam_mulai} – ${selectedEvent.jam_selesai}` : '-', icon: <Clock size={13} className="text-yellow-500" /> },
                                    { label: 'Lokasi',    value: selectedEvent.area_event || '-', icon: <MapPin size={13} className="text-yellow-500" /> },
                                    { label: 'Kapasitas', value: selectedEvent.jumlah_pax ? `${selectedEvent.jumlah_pax} orang` : '-', icon: <Users size={13} className="text-yellow-500" /> },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-gray-800 rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">{item.icon}<p className="text-[10px] font-bold text-gray-500 uppercase">{item.label}</p></div>
                                        <p className="text-sm font-semibold text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {selectedEvent.deskripsi_event && (
                                <div className="p-4 mb-3 bg-gray-800 rounded-xl">
                                    <p className="mb-1.5 text-[10px] font-bold text-gray-500 uppercase">Deskripsi</p>
                                    <p className="text-sm leading-relaxed text-gray-300">{selectedEvent.deskripsi_event}</p>
                                </div>
                            )}

                            {(selectedEvent.entairtainment_event || selectedEvent.food_beverage_event) && (
                                <div className="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
                                    {selectedEvent.entairtainment_event && (
                                        <div className="p-3 bg-gray-800 rounded-xl">
                                            <p className="mb-1 text-[10px] font-bold text-gray-500 uppercase">Entertainment</p>
                                            <p className="text-sm text-gray-300">{selectedEvent.entairtainment_event}</p>
                                        </div>
                                    )}
                                    {selectedEvent.food_beverage_event && (
                                        <div className="p-3 bg-gray-800 rounded-xl">
                                            <p className="mb-1 text-[10px] font-bold text-gray-500 uppercase">Food & Beverage</p>
                                            <p className="text-sm text-gray-300">{selectedEvent.food_beverage_event}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <a href={isLoggedIn ? `${BASE_URL}/appointment/create` : `${BASE_URL}/register`}
                                className="block w-full py-3.5 text-sm font-black text-center text-black transition-all bg-yellow-500 rounded-2xl hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20 mt-4">
                                🗓️ Buat Appointment
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FOOTER ────────────────────────────────────────────── */}
            <footer className="py-8 bg-black border-t border-yellow-500/20">
                <div className="flex flex-col items-center justify-between gap-4 px-6 mx-auto max-w-7xl md:flex-row">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-black border border-yellow-500 rounded-full">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-white">Laksamana <span className="text-yellow-500">Muda</span></span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href={`${BASE_URL}/`} className="text-xs text-gray-600 hover:text-yellow-400 transition-colors">Home</a>
                        {isLoggedIn ? (
                            <a href={`${BASE_URL}/dashboard`} className="text-xs text-gray-600 hover:text-yellow-400 transition-colors">Dashboard</a>
                        ) : (
                            <a href={`${BASE_URL}/login`} className="text-xs text-gray-600 hover:text-yellow-400 transition-colors">Login</a>
                        )}
                    </div>
                    <p className="text-xs text-gray-700">© {new Date().getFullYear()} Laksamana Muda. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}
