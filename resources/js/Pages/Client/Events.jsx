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
        if (status === 'Done')      return { label: 'Selesai',   cls: 'bg-green-500/20 text-ok border-ok/30' };
        if (status === 'Upcoming')    return { label: 'Upcoming',  cls: 'bg-blue-500/20 text-info border-blue-500/30' };
        if (status === 'Pending')   return { label: 'Pending',   cls: 'bg-gold-soft text-gold-dim border-gold-2' };
        if (status === 'Cancelled') return { label: 'Dibatalkan',cls: 'bg-red-500/20 text-danger border-danger/30' };
        return { label: status || '-', cls: 'bg-paper text-muted border-line' };
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
            <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-ink/40 backdrop-blur-md border-line">
                <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
                    <a href={`${BASE_URL}/`} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-surface border-2 border-gold rounded-full">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-8 h-8" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-ink">
                            Laksamana <span className="text-gold">Muda</span>
                        </span>
                    </a>

                    <div className="items-center hidden gap-8 md:flex">
                        <a href={`${BASE_URL}/`} className="text-sm font-medium text-muted transition-colors hover:text-gold-dim">Home</a>
                        <a href={`${BASE_URL}/events`} className="text-sm font-bold text-gold-dim border-b-2 border-gold pb-0.5">Events</a>
                    </div>

                    <div className="items-center hidden gap-3 md:flex">
                        {isLoggedIn ? (
                            <div className="relative">
                                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-4 py-2 transition-colors border rounded-full bg-gold-soft border-gold-2 hover:bg-gold-soft">
                                    <div className="flex items-center justify-center w-6 h-6 text-xs font-black text-white bg-gold rounded-full">
                                        {auth?.user?.nama_client?.substring(0, 1).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-bold text-gold-dim">{auth?.user?.nama_client?.split(' ')[0]}</span>
                                    <ChevronDown size={14} className={`text-gold-dim transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 w-52 overflow-hidden bg-surface border border-line shadow-xl top-12 rounded-2xl">
                                        <div className="p-3 border-b border-line">
                                            <p className="text-xs font-bold text-ink truncate">{auth?.user?.nama_client}</p>
                                            <p className="text-[10px] text-muted truncate">{auth?.user?.email_client}</p>
                                        </div>
                                        <a href={`${BASE_URL}/dashboard`} className="flex items-center gap-2 px-4 py-3 text-sm text-muted transition-colors hover:bg-gold-soft hover:text-gold-dim">
                                            <HomeIcon size={14} /> Dashboard
                                        </a>
                                        <a href={`${BASE_URL}/appointment/create`} className="flex items-center gap-2 px-4 py-3 text-sm text-muted transition-colors hover:bg-gold-soft hover:text-gold-dim">
                                            <Calendar size={14} /> Buat Appointment
                                        </a>
                                        <button onClick={() => router.post(route('client.logout'))}
                                            className="flex items-center w-full gap-2 px-4 py-3 text-sm text-danger transition-colors border-t border-line hover:bg-danger-bg">
                                            <LogOut size={14} /> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <a href={`${BASE_URL}/login`} className="px-4 py-2 text-sm font-bold text-gold-dim transition-colors border rounded-full border-gold-2 hover:bg-gold-soft">Masuk</a>
                                <a href={`${BASE_URL}/register`} className="px-5 py-2 text-sm font-black text-white transition-colors bg-gold rounded-full hover:bg-gold-2">Daftar</a>
                            </>
                        )}
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-ink md:hidden">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="px-6 py-4 space-y-3 bg-surface border-t md:hidden border-line">
                        <a href={`${BASE_URL}/`} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-gold-dim">Home</a>
                        <a href={`${BASE_URL}/events`} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-bold text-gold-dim">Events</a>
                        <div className="pt-3 space-y-2 border-t border-line">
                            {isLoggedIn ? (
                                <>
                                    <a href={`${BASE_URL}/dashboard`} className="flex items-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-gold-dim bg-gold-soft rounded-xl">
                                        <HomeIcon size={14} /> Dashboard
                                    </a>
                                    <button onClick={() => router.post(route('client.logout'))}
                                        className="flex items-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-danger bg-danger-bg rounded-xl">
                                        <LogOut size={14} /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-3">
                                    <a href={`${BASE_URL}/login`} className="flex-1 py-2 text-sm font-bold text-center text-gold-dim border rounded-full border-gold-2">Masuk</a>
                                    <a href={`${BASE_URL}/register`} className="flex-1 py-2 text-sm font-black text-center text-white bg-gold rounded-full">Daftar</a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO BANNER ───────────────────────────────────────── */}
            <section className="relative flex items-end pt-28 pb-14 overflow-hidden bg-surface min-h-[260px]">
                <div className="absolute inset-0 bg-gradient-to-br from-paper via-surface to-paper" />
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #F59E0B 0%, transparent 60%)' }} />
                <div className="relative z-10 px-6 mx-auto max-w-7xl w-full">
                    <p className="text-gold font-bold tracking-[0.3em] text-xs uppercase mb-3">Portfolio & Galeri</p>
                    <h1 className="text-4xl font-black text-ink md:text-5xl">
                        Semua <span className="text-gold">Event</span>
                    </h1>
                    <p className="mt-3 text-muted max-w-xl text-sm leading-relaxed">
                        Jelajahi seluruh event yang telah dan akan diselenggarakan oleh Laksamana Muda.
                    </p>
                    {events?.total != null && (
                        <p className="mt-3 text-xs text-muted-2">
                            <span className="font-bold text-gold">{events.total}</span> event tersedia
                        </p>
                    )}
                </div>
            </section>

            {/* ── FILTER BAR ────────────────────────────────────────── */}
            <section className="sticky top-[73px] z-40 bg-paper/95 backdrop-blur-sm border-b border-line shadow-lg">
                <div className="px-6 py-4 mx-auto max-w-7xl">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Status Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {statusTabs.map(tab => (
                                <button key={tab.key} onClick={() => handleStatus(tab.key)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        activeStatus === tab.key
                                            ? 'bg-gold text-white border-gold shadow-sm shadow-yellow-500/20'
                                            : 'text-muted border-line hover:border-gold-2 hover:text-gold-dim'
                                    }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search + Kategori */}
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Search size={13} className="absolute text-muted left-3 top-2.5" />
                                <input type="text" placeholder="Cari event..." value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 text-xs bg-surface border border-line rounded-xl text-muted focus:border-gold focus:outline-none w-full sm:w-44 transition-colors" />
                            </div>
                            <select value={activeKategori} onChange={e => handleKategori(e.target.value)}
                                className="px-3 py-2 text-xs bg-surface border border-line rounded-xl text-muted focus:border-gold focus:outline-none transition-colors">
                                {allKategoris.map(k => (
                                    <option key={k} value={k}>{k === 'all' ? 'Semua Kategori' : k}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── EVENT GRID ────────────────────────────────────────── */}
            <section className="py-14 bg-paper min-h-screen">
                <div className="px-6 mx-auto max-w-7xl">

                    {eventsData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {eventsData.map(event => {
                                    const badge = getStatusBadge(event.status_event);
                                    return (
                                        <article key={event.id_event}
                                            onClick={() => setSelectedEvent(event)}
                                            className="relative overflow-hidden transition-all duration-300 bg-surface border border-line cursor-pointer group rounded-2xl hover:border-gold-2 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-yellow-500/10">

                                            {/* ── Image ── */}
                                            <div className="relative overflow-hidden h-64">
                                                {event.poster_event ? (
                                                    <img src={`/${event.poster_event}`} alt={event.nama_event}
                                                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-gold-soft via-paper to-surface">
                                                        <span className="text-5xl mb-2">{getCategoryIcon(event.kategori_event)}</span>
                                                        <span className="text-lg font-black text-gold/30">
                                                            {event.nama_event.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

                                                {/* Top badges */}
                                                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                                                    {event.kategori_event && (
                                                        <span className="px-2.5 py-1 text-[10px] font-black bg-ink/40 backdrop-blur-sm text-gold-dim rounded-full border border-gold-2">
                                                            {getCategoryIcon(event.kategori_event)} {event.kategori_event}
                                                        </span>
                                                    )}
                                                    <span className={`ml-auto px-2.5 py-1 text-[10px] font-black rounded-full border ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>

                                                {/* Bottom overlay: date + location */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="mb-1.5 text-base font-black text-ink line-clamp-2 leading-snug group-hover:text-gold-dim transition-colors">
                                                        {event.nama_event}
                                                    </h3>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="flex items-center gap-1 text-[11px] text-muted">
                                                            <Calendar size={10} className="text-gold" />
                                                            {new Date(event.tgl_mulai_event).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {event.jam_mulai && (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted">
                                                                <Clock size={10} className="text-gold" />
                                                                {event.jam_mulai}
                                                            </span>
                                                        )}
                                                        {event.area_event && (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted">
                                                                <MapPin size={10} className="text-gold" />
                                                                {event.area_event}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Hover CTA */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-ink/40">
                                                    <span className="px-5 py-2 text-sm font-black text-white bg-gold rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                                        Lihat Detail →
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ── Card Footer ── */}
                                            {event.jumlah_pax && (
                                                <div className="flex items-center gap-1.5 px-4 py-3 border-t border-line">
                                                    <Users size={12} className="text-muted" />
                                                    <span className="text-[11px] text-muted">{event.jumlah_pax} tamu</span>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>

                            {/* ── Pagination ── */}
                            {events?.last_page > 1 && (
                                <div className="flex flex-col items-center gap-3 mt-12 sm:flex-row sm:justify-between">
                                    <p className="text-xs text-muted">
                                        Menampilkan <span className="font-bold text-muted">{events.from}–{events.to}</span> dari{' '}
                                        <span className="font-bold text-gold-dim">{events.total}</span> event
                                    </p>
                                    <div className="flex items-center gap-1">
                                        {/* Prev */}
                                        {events.links[0]?.url ? (
                                            <a href={events.links[0].url}
                                                className="flex items-center justify-center w-9 h-9 text-muted bg-surface border border-line rounded-xl hover:bg-gold-soft hover:border-gold-2 hover:text-gold-dim transition-all">
                                                <ChevronLeft size={16} />
                                            </a>
                                        ) : (
                                            <span className="flex items-center justify-center w-9 h-9 text-muted-2 bg-surface/50 border border-line rounded-xl cursor-not-allowed">
                                                <ChevronLeft size={16} />
                                            </span>
                                        )}

                                        {/* Page numbers */}
                                        {events.links.slice(1, -1).map((link, i) => (
                                            link.label === '...' ? (
                                                <span key={'ellipsis-' + i} className="flex items-center justify-center w-9 h-9 text-xs text-muted-2">…</span>
                                            ) : link.url ? (
                                                <a key={link.label + '-' + i} href={link.url}
                                                    className={`flex items-center justify-center w-9 h-9 text-xs font-bold rounded-xl border transition-all ${
                                                        link.active
                                                            ? 'bg-gold text-white border-gold shadow-sm shadow-yellow-500/30'
                                                            : 'bg-surface text-muted border-line hover:bg-gold-soft hover:border-gold-2 hover:text-gold-dim'
                                                    }`}>
                                                    {link.label}
                                                </a>
                                            ) : (
                                                <span key={link.label + '-disabled-' + i}
                                                    className="flex items-center justify-center w-9 h-9 text-xs font-bold text-muted-2 bg-surface/50 border border-line rounded-xl">
                                                    {link.label}
                                                </span>
                                            )
                                        ))}

                                        {/* Next */}
                                        {events.links[events.links.length - 1]?.url ? (
                                            <a href={events.links[events.links.length - 1].url}
                                                className="flex items-center justify-center w-9 h-9 text-muted bg-surface border border-line rounded-xl hover:bg-gold-soft hover:border-gold-2 hover:text-gold-dim transition-all">
                                                <ChevronRight size={16} />
                                            </a>
                                        ) : (
                                            <span className="flex items-center justify-center w-9 h-9 text-muted-2 bg-surface/50 border border-line rounded-xl cursor-not-allowed">
                                                <ChevronRight size={16} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="flex items-center justify-center w-24 h-24 mb-6 text-4xl bg-surface border border-line rounded-full">🎪</div>
                            <h3 className="mb-2 text-lg font-bold text-muted">Tidak ada event ditemukan</h3>
                            <p className="text-sm text-muted-2">Coba ubah filter atau kata kunci pencarian.</p>
                            {(search || activeStatus !== 'all' || activeKategori !== 'all') && (
                                <button onClick={() => { setSearch(''); setActiveStatus('all'); setActiveKategori('all'); applyFilter({ search: '', status: '', kategori: '' }); }}
                                    className="mt-4 px-5 py-2 text-sm font-bold text-gold-dim border border-gold-2 rounded-xl hover:bg-gold-soft transition-colors">
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── MODAL DETAIL ──────────────────────────────────────── */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}>
                    <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-line"
                        onClick={e => e.stopPropagation()}>

                        {/* Poster — taller modal */}
                        <div className="relative h-64 overflow-hidden rounded-t-3xl flex-shrink-0">
                            {selectedEvent.poster_event ? (
                                <img src={`/${selectedEvent.poster_event}`} alt={selectedEvent.nama_event}
                                    className="object-cover w-full h-full" />
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-gold-soft to-paper">
                                    <span className="text-5xl mb-2">{getCategoryIcon(selectedEvent.kategori_event)}</span>
                                    <span className="text-4xl font-black text-gold/30">{selectedEvent.nama_event.substring(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
                            <button onClick={() => setSelectedEvent(null)}
                                className="absolute flex items-center justify-center w-9 h-9 transition-colors bg-ink/40 backdrop-blur-sm rounded-full top-4 right-4 hover:bg-surface border border-line">
                                <X size={16} className="text-ink" />
                            </button>
                            {/* Status + Kategori at bottom */}
                            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                                <div>
                                    {selectedEvent.kategori_event && (
                                        <span className="inline-block mb-1.5 px-2.5 py-0.5 bg-ink/40 backdrop-blur-sm text-gold-dim text-[10px] font-black uppercase rounded-full border border-gold-2">
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
                            <h2 className="mb-4 text-xl font-extrabold text-ink leading-snug">{selectedEvent.nama_event}</h2>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    { label: 'Tanggal',   value: formatTanggal(selectedEvent.tgl_mulai_event), icon: <Calendar size={13} className="text-gold" /> },
                                    { label: 'Jam',       value: selectedEvent.jam_mulai && selectedEvent.jam_selesai ? `${selectedEvent.jam_mulai} – ${selectedEvent.jam_selesai}` : '-', icon: <Clock size={13} className="text-gold" /> },
                                    { label: 'Lokasi',    value: selectedEvent.area_event || '-', icon: <MapPin size={13} className="text-gold" /> },
                                    { label: 'Kapasitas', value: selectedEvent.jumlah_pax ? `${selectedEvent.jumlah_pax} orang` : '-', icon: <Users size={13} className="text-gold" /> },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-paper rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">{item.icon}<p className="text-[10px] font-bold text-muted uppercase">{item.label}</p></div>
                                        <p className="text-sm font-semibold text-ink">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {selectedEvent.deskripsi_event && (
                                <div className="p-4 mb-3 bg-paper rounded-xl">
                                    <p className="mb-1.5 text-[10px] font-bold text-muted uppercase">Deskripsi</p>
                                    <p className="text-sm leading-relaxed text-muted">{selectedEvent.deskripsi_event}</p>
                                </div>
                            )}

                            {(selectedEvent.entairtainment_event || selectedEvent.food_beverage_event) && (
                                <div className="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
                                    {selectedEvent.entairtainment_event && (
                                        <div className="p-3 bg-paper rounded-xl">
                                            <p className="mb-1 text-[10px] font-bold text-muted uppercase">Entertainment</p>
                                            <p className="text-sm text-muted">{selectedEvent.entairtainment_event}</p>
                                        </div>
                                    )}
                                    {selectedEvent.food_beverage_event && (
                                        <div className="p-3 bg-paper rounded-xl">
                                            <p className="mb-1 text-[10px] font-bold text-muted uppercase">Food & Beverage</p>
                                            <p className="text-sm text-muted">{selectedEvent.food_beverage_event}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <a href={isLoggedIn ? `${BASE_URL}/appointment/create` : `${BASE_URL}/register`}
                                className="block w-full py-3.5 text-sm font-black text-center text-white transition-all bg-gold rounded-2xl hover:bg-gold-2 hover:shadow-lg hover:shadow-yellow-500/20 mt-4">
                                🗓️ Buat Appointment
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FOOTER ────────────────────────────────────────────── */}
            <footer className="py-8 bg-surface border-t border-line">
                <div className="flex flex-col items-center justify-between gap-4 px-6 mx-auto max-w-7xl md:flex-row">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-surface border border-gold rounded-full">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-ink">Laksamana <span className="text-gold">Muda</span></span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href={`${BASE_URL}/`} className="text-xs text-muted-2 hover:text-gold-dim transition-colors">Home</a>
                        {isLoggedIn ? (
                            <a href={`${BASE_URL}/dashboard`} className="text-xs text-muted-2 hover:text-gold-dim transition-colors">Dashboard</a>
                        ) : (
                            <a href={`${BASE_URL}/login`} className="text-xs text-muted-2 hover:text-gold-dim transition-colors">Login</a>
                        )}
                    </div>
                    <p className="text-xs text-muted-2">© {new Date().getFullYear()} Laksamana Muda. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}
