import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ChevronDown, Phone, Mail, MapPin, Menu, X,
    Home as HomeIcon, Calendar, LogOut,
    CheckCircle, Users, Award, Layers, ArrowRight,
    Clock, MapPinned, Music, Utensils
} from 'lucide-react';

const IconInstagram = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
);
const IconFacebook = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);
const IconYoutube = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
);

export default function Home({ portfolio, upcoming, stats, isLoggedIn, auth }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen]     = useState(false);
    const [selectedEvent, setSelectedEvent]   = useState(null);
    const [portfolioFilter, setPortfolioFilter] = useState('all');

    const BASE_URL = window.location.origin;

    const navLinks = [
        { label: 'Home',      href: '#home' },
        { label: 'About',     href: '#about' },
        { label: 'Layanan',   href: '#layanan' },
        { label: 'Upcoming',  href: '#upcoming' },
        { label: 'Portfolio', href: '#portfolio' },
        { label: 'Kontak',    href: '#kontak' },
        { label: 'All Events', href: `${BASE_URL}/events` },
    ];

    const layanan = [
        { title: 'Corporate Event',  desc: 'Seminar, konferensi, gathering perusahaan dengan standar profesional tinggi.', icon: '🏢' },
        { title: 'Wedding & Gala',   desc: 'Pernikahan mewah dan gala dinner yang tak terlupakan untuk momen istimewa.', icon: '💍' },
        { title: 'Music & Concert',  desc: 'Konser musik dan pertunjukan hiburan dengan tata panggung kelas dunia.', icon: '🎵' },
        { title: 'Exhibition',       desc: 'Pameran produk dan brand activation yang menarik perhatian audiens.', icon: '🎪' },
        { title: 'Sports Event',     desc: 'Turnamen olahraga dan event kompetisi yang terorganisir dengan baik.', icon: '🏆' },
        { title: 'Private Party',    desc: 'Pesta ulang tahun, reuni, dan perayaan pribadi yang berkesan.', icon: '🎉' },
    ];

    const keunggulan = [
        { icon: <CheckCircle size={20} />, title: 'Berpengalaman',     desc: 'Ratusan event sukses dari skala kecil hingga besar.' },
        { icon: <Users size={20} />,       title: 'Tim Profesional',   desc: 'Didukung oleh tim berpengalaman di bidangnya.' },
        { icon: <Award size={20} />,       title: 'Terpercaya',        desc: 'Kepuasan client adalah prioritas utama kami.' },
        { icon: <Layers size={20} />,      title: 'One-Stop Solution', desc: 'Semua kebutuhan event Anda kami handle dari A–Z.' },
    ];

    const kategoriPortfolio = ['all', ...Array.from(new Set(portfolio.map(e => e.kategori_event).filter(Boolean)))];
    const filteredPortfolio = portfolioFilter === 'all'
        ? portfolio
        : portfolio.filter(e => e.kategori_event === portfolioFilter);

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // "10:00:00" → "10:00"; kembalikan null bila kosong
    const formatJam = (jam) => (jam ? String(jam).slice(0, 5) : null);

    const formatTanggalShort = (tgl) => {
        if (!tgl) return '-';
        const d = new Date(tgl);
        return {
            day:   d.toLocaleDateString('id-ID', { day: '2-digit' }),
            month: d.toLocaleDateString('id-ID', { month: 'short' }),
            year:  d.getFullYear(),
        };
    };

    const getStatusBadge = (status) => {
        if (status === 'Done')    return { label: 'Selesai', cls: 'bg-green-500/20 text-ok' };
        if (status === 'Upcoming')  return { label: 'Upcoming', cls: 'bg-blue-500/20 text-info' };
        if (status === 'Pending') return { label: 'Pending', cls: 'bg-gold-soft text-gold-dim' };
        return { label: status, cls: 'bg-paper text-muted' };
    };

    const statItems = [
        { value: stats.totalEventDone + '+', label: 'Event Selesai',   icon: <CheckCircle size={20} /> },
        { value: stats.totalClient    + '+', label: 'Client Puas',     icon: <Users size={20} /> },
        { value: stats.totalKategori  + '+', label: 'Jenis Layanan',   icon: <Layers size={20} /> },
        { value: '5+',                        label: 'Tahun Pengalaman', icon: <Award size={20} /> },
    ];

    return (
        <>
            <Head title="Laksamana Muda - Event Organizer Professional" />

            {/* ── NAVBAR ─────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-surface/85 backdrop-blur-md border-line shadow-lm">
                <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
                    <a href="#home" className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-surface border-2 border-gold rounded-full">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-8 h-8" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-ink">
                            Laksamana <span className="text-gold">Muda</span>
                        </span>
                    </a>

                    <div className="items-center hidden gap-6 md:flex">
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href}
                                className={`text-sm font-medium transition-colors ${link.label === 'All Events' ? 'text-gold-dim font-bold' : 'text-muted hover:text-gold-dim'}`}>
                                {link.label}
                            </a>
                        ))}
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
                                    <div className="absolute right-0 w-48 overflow-hidden bg-surface border border-line shadow-xl top-12 rounded-2xl">
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
                                <a href={`${BASE_URL}/login`} className="px-4 py-2 text-sm font-bold text-gold-dim transition-all border-[1.5px] rounded-full bg-surface border-line hover:border-gold-2 hover:bg-gold-soft">Masuk</a>
                                <a href={`${BASE_URL}/register`} className="px-5 py-2 text-sm font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110">Daftar</a>
                            </>
                        )}
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-ink md:hidden">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="px-6 py-4 space-y-3 bg-surface border-t md:hidden border-line">
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                                className="block text-sm font-medium text-muted hover:text-gold-dim">{link.label}</a>
                        ))}
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
                                    <a href={`${BASE_URL}/register`} className="flex-1 py-2 text-sm font-black text-center text-white rounded-full bg-gold-grad shadow-gold">Daftar</a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO ───────────────────────────────────────────── */}
            <section id="home" className="relative flex items-center justify-center min-h-screen overflow-hidden bg-surface">
                <div className="absolute inset-0 bg-gradient-to-br from-paper via-surface to-paper" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #F59E0B 0%, transparent 60%)' }} />
                <div className="relative z-10 max-w-5xl px-6 mx-auto text-center">
                    <p className="text-gold font-bold tracking-[0.3em] text-sm uppercase mb-6">Professional Event Organizer — Pekanbaru, Riau</p>
                    <h1 className="mb-6 text-5xl font-black leading-tight text-ink md:text-7xl">
                        Kami Wujudkan<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-2 to-gold-dim">Event Impian</span><br />
                        Anda
                    </h1>
                    <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed text-muted md:text-xl">
                        Laksamana Muda hadir dengan pengalaman bertahun-tahun menghadirkan event berkelas,
                        profesional, dan tak terlupakan — dari corporate hingga private party.
                    </p>
                    <div className="flex flex-col justify-center gap-4 sm:flex-row">
                        <a href={isLoggedIn ? `${BASE_URL}/appointment/create` : `${BASE_URL}/register`}
                            className="px-8 py-4 text-lg font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110 hover:scale-105">
                            🗓️ Buat Appointment
                        </a>
                        <a href="#portfolio" className="px-8 py-4 text-lg font-bold text-gold-dim transition-all border-[1.5px] rounded-full bg-surface border-line shadow-lm hover:border-gold-2 hover:bg-gold-soft hover:scale-105">
                            Lihat Portfolio
                        </a>
                    </div>
                </div>
                <a href="#stats" className="absolute text-gold -translate-x-1/2 bottom-8 left-1/2 animate-bounce">
                    <ChevronDown size={32} />
                </a>
            </section>

            {/* ── STATS BAR ──────────────────────────────────────── */}
            <section id="stats" className="py-16 bg-gold-grad">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:divide-x md:divide-white/20">
                        {statItems.map(s => (
                            <div key={s.label} className="px-4 text-center">
                                <div className="inline-flex items-center justify-center w-11 h-11 mb-3 text-white rounded-full bg-white/15 ring-1 ring-white/25">{s.icon}</div>
                                <p className="text-4xl font-black tracking-tight text-white tabular-nums">{s.value}</p>
                                <p className="mt-1 text-sm font-bold tracking-wide text-white/75">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ABOUT ──────────────────────────────────────────── */}
            <section id="about" className="py-24 bg-paper bg-paper-glow">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="grid items-center grid-cols-1 gap-16 lg:grid-cols-2">
                        <div>
                            <p className="mb-4 text-sm font-bold tracking-widest text-gold uppercase">Tentang Kami</p>
                            <h2 className="mb-6 text-4xl font-black leading-tight text-ink md:text-5xl">
                                Pengalaman &<br /><span className="text-gold">Kepercayaan</span>
                            </h2>
                            <p className="mb-6 text-lg leading-relaxed text-muted">
                                Laksamana Muda adalah Event Organizer profesional yang berpengalaman dalam
                                mengelola berbagai jenis event — dari skala intimate hingga grand scale.
                                Kami hadir untuk memastikan setiap event Anda berjalan sempurna dan berkesan.
                            </p>
                            <p className="mb-8 text-lg leading-relaxed text-muted">
                                Dengan tim berdedikasi dan jaringan vendor terpercaya di Pekanbaru dan sekitarnya,
                                kami siap mewujudkan visi Anda menjadi kenyataan yang menakjubkan.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {keunggulan.map(k => (
                                    <div key={k.title} className="flex items-start gap-3 p-4 border border-line rounded-2xl bg-surface shadow-lm">
                                        <div className="text-gold mt-0.5 shrink-0">{k.icon}</div>
                                        <div>
                                            <p className="text-sm font-bold text-ink">{k.title}</p>
                                            <p className="mt-0.5 text-xs text-muted">{k.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="flex items-center justify-center w-full border h-96 bg-gradient-to-br from-gold-soft to-transparent rounded-3xl border-line">
                                <div className="flex items-center justify-center w-32 h-32 overflow-hidden bg-surface border-4 border-gold rounded-full">
                                    <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-24 h-24" />
                                </div>
                            </div>
                            <div className="absolute w-48 h-48 -bottom-4 -right-4 bg-gold-soft rounded-3xl -z-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── LAYANAN ────────────────────────────────────────── */}
            <section id="layanan" className="py-24 bg-surface">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="mb-16 text-center">
                        <p className="mb-4 text-sm font-bold tracking-widest text-gold uppercase">Apa yang Kami Tawarkan</p>
                        <h2 className="text-4xl font-black text-ink md:text-5xl">Layanan <span className="text-gold">Kami</span></h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {layanan.map(item => (
                            <div key={item.title} className="p-6 transition-all duration-300 bg-surface border border-line rounded-2xl hover:border-gold-2 hover:-translate-y-1 group">
                                <div className="mb-4 text-4xl">{item.icon}</div>
                                <h3 className="mb-2 text-lg font-bold text-ink transition-colors group-hover:text-gold-dim">{item.title}</h3>
                                <p className="text-sm leading-relaxed text-muted">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-10 mt-16 text-center border bg-gradient-to-r from-gold-soft to-transparent border-line rounded-3xl">
                        <h3 className="mb-3 text-2xl font-black text-ink">Tertarik dengan layanan kami?</h3>
                        <p className="mb-6 text-muted">Buat appointment sekarang dan diskusikan kebutuhan event Anda bersama tim kami.</p>
                        <a href={isLoggedIn ? `${BASE_URL}/appointment/create` : `${BASE_URL}/register`}
                            className="inline-block px-8 py-3 font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110 hover:scale-105">
                            🗓️ Buat Appointment
                        </a>
                    </div>
                </div>
            </section>

            {/* ── UPCOMING EVENTS ────────────────────────────────── */}
            <section id="upcoming" className="py-24 bg-paper bg-paper-glow">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <p className="mb-3 text-sm font-bold tracking-widest text-gold uppercase">Segera Hadir</p>
                            <h2 className="text-4xl font-black text-ink md:text-5xl">Upcoming <span className="text-gold">Events</span></h2>
                        </div>
                        <a href={`${BASE_URL}/events`} className="hidden md:flex items-center gap-2 text-sm font-bold text-gold-dim hover:text-gold transition-colors">
                            Lihat Semua <ArrowRight size={16} />
                        </a>
                    </div>

                    {upcoming.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {upcoming.map(event => {
                                const tgl = formatTanggalShort(event.tgl_mulai_event);
                                return (
                                    <div key={event.id_event}
                                        className="overflow-hidden transition-all duration-300 bg-surface border border-line rounded-2xl hover:border-gold-2 hover:-translate-y-1 group">
                                        <div className="relative h-40 overflow-hidden">
                                            {event.poster_event ? (
                                                <img src={`/${event.poster_event}`} alt={event.nama_event}
                                                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gold-soft to-paper">
                                                    <span className="text-4xl font-black text-gold/20">{event.nama_event.substring(0,2).toUpperCase()}</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
                                            {/* Tanggal badge */}
                                            <div className="absolute top-3 left-3 bg-gold rounded-xl px-2.5 py-1.5 text-center min-w-[48px]">
                                                <p className="text-lg font-black leading-none text-white">{tgl.day}</p>
                                                <p className="text-[10px] font-bold text-white/80 uppercase">{tgl.month}</p>
                                            </div>
                                            <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-black bg-blue-500/30 text-blue-300 rounded-full uppercase">
                                                Upcoming
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="mb-2 text-sm font-bold text-ink truncate group-hover:text-gold-dim transition-colors">{event.nama_event}</h3>
                                            {event.kategori_event && (
                                                <span className="inline-block mb-2 px-2 py-0.5 text-[10px] font-bold bg-gold-soft text-gold-dim rounded-full">
                                                    {event.kategori_event}
                                                </span>
                                            )}
                                            <div className="space-y-1">
                                                {event.jam_mulai && (
                                                    <p className="flex items-center gap-1.5 text-xs text-muted">
                                                        <Clock size={11} /> {event.jam_mulai} – {event.jam_selesai}
                                                    </p>
                                                )}
                                                {event.area_event && (
                                                    <p className="flex items-center gap-1.5 text-xs text-muted">
                                                        <MapPinned size={11} /> {event.area_event}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 text-center border border-line rounded-3xl">
                            <p className="text-4xl mb-3">📅</p>
                            <p className="font-bold text-muted">Belum ada upcoming event saat ini.</p>
                            <p className="mt-1 text-sm text-muted-2">Pantau terus untuk update terbaru!</p>
                        </div>
                    )}

                    <div className="mt-8 text-center md:hidden">
                        <a href={`${BASE_URL}/events`} className="inline-flex items-center gap-2 text-sm font-bold text-gold-dim">
                            Lihat Semua Event <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* ── PORTFOLIO ──────────────────────────────────────── */}
            <section id="portfolio" className="py-24 bg-surface">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="mb-12 text-center">
                        <p className="mb-4 text-sm font-bold tracking-widest text-gold uppercase">Karya Terbaik Kami</p>
                        <h2 className="text-4xl font-black text-ink md:text-5xl">Portfolio <span className="text-gold">Event</span></h2>
                    </div>

                    {/* Filter Kategori */}
                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        {kategoriPortfolio.map(k => (
                            <button key={k} onClick={() => setPortfolioFilter(k)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    portfolioFilter === k
                                        ? 'bg-gold-grad text-white border-gold-dim'
                                        : 'text-muted border-line hover:border-gold-2 hover:text-gold-dim'
                                }`}>
                                {k === 'all' ? 'Semua' : k}
                            </button>
                        ))}
                    </div>

                    {filteredPortfolio.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredPortfolio.map(event => (
                                <div key={event.id_event}
                                    onClick={() => setSelectedEvent(event)}
                                    className="relative overflow-hidden transition-all duration-300 bg-surface border border-line cursor-pointer group rounded-2xl hover:border-gold-2">
                                    {event.poster_event ? (
                                        <img src={`/${event.poster_event}`} alt={event.nama_event}
                                            className="object-cover w-full h-56 transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-56 bg-gradient-to-br from-gold-soft to-transparent">
                                            <span className="text-4xl font-black text-gold/30">{event.nama_event.substring(0,2).toUpperCase()}</span>
                                        </div>
                                    )}
                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-0 bg-ink/40 group-hover:opacity-100">
                                        <span className="px-4 py-2 text-sm font-bold text-white bg-gold rounded-full">Lihat Detail</span>
                                    </div>
                                    <div className="p-5">
                                        <p className="font-bold text-ink truncate group-hover:text-gold-dim transition-colors">{event.nama_event}</p>
                                        <p className="mt-1 text-xs text-muted">{formatTanggal(event.tgl_mulai_event)}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted">
                                            {event.area_event && (
                                                <span className="flex items-center gap-1"><MapPin size={11} className="text-gold" /> {event.area_event}</span>
                                            )}
                                            {event.jumlah_pax > 0 && (
                                                <span className="flex items-center gap-1"><Users size={11} className="text-gold" /> {Number(event.jumlah_pax).toLocaleString('id-ID')} tamu</span>
                                            )}
                                        </div>
                                        {event.kategori_event && (
                                            <span className="mt-2 inline-block px-2 py-0.5 text-xs font-bold bg-gold-soft text-gold-dim rounded-full">
                                                {event.kategori_event}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-muted-2">
                            <p className="text-lg font-bold">Belum ada portfolio untuk kategori ini.</p>
                        </div>
                    )}

                    <div className="mt-12 text-center">
                        <a href={`${BASE_URL}/events`}
                            className="inline-flex items-center gap-2 px-8 py-3 text-sm font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110 hover:scale-105">
                            Lihat Semua Event <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* Modal Portfolio Detail */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}>
                    <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl border border-line"
                        onClick={e => e.stopPropagation()}>
                        <div className="relative h-56 overflow-hidden rounded-t-3xl">
                            {selectedEvent.poster_event ? (
                                <img src={`/${selectedEvent.poster_event}`} className="object-cover w-full h-full" />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gold-soft to-paper">
                                    <span className="text-5xl font-black text-gold/30">{selectedEvent.nama_event.substring(0,2).toUpperCase()}</span>
                                </div>
                            )}
                            {/* Gradasi bawah agar badge kategori terbaca di atas poster */}
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/60 to-transparent" />
                            {selectedEvent.kategori_event && (
                                <span className="absolute bottom-4 left-5 px-3 py-1 bg-gold text-white text-[10px] font-black uppercase tracking-wide rounded-full shadow-gold">
                                    {selectedEvent.kategori_event}
                                </span>
                            )}
                            <button onClick={() => setSelectedEvent(null)}
                                className="absolute flex items-center justify-center w-9 h-9 bg-surface/90 backdrop-blur-sm border border-line rounded-full top-4 right-4 hover:bg-surface hover:border-gold-2 transition-colors">
                                <X size={16} className="text-ink" />
                            </button>
                        </div>
                        <div className="p-6">
                            <h3 className="mb-4 text-2xl font-extrabold leading-tight text-ink">{selectedEvent.nama_event}</h3>

                            {/* Grid ringkas: skala & waktu acara */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="p-3 border bg-paper border-line rounded-xl">
                                    <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted-2 uppercase"><Calendar size={12} className="text-gold" /> Tanggal</p>
                                    <p className="mt-1 text-sm font-bold text-ink">{formatTanggal(selectedEvent.tgl_mulai_event)}</p>
                                </div>
                                {formatJam(selectedEvent.jam_mulai) && (
                                    <div className="p-3 border bg-paper border-line rounded-xl">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted-2 uppercase"><Clock size={12} className="text-gold" /> Waktu</p>
                                        <p className="mt-1 text-sm font-bold text-ink">{formatJam(selectedEvent.jam_mulai)}{formatJam(selectedEvent.jam_selesai) ? ` – ${formatJam(selectedEvent.jam_selesai)}` : ''} WIB</p>
                                    </div>
                                )}
                                {selectedEvent.area_event && (
                                    <div className="p-3 border bg-paper border-line rounded-xl">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted-2 uppercase"><MapPin size={12} className="text-gold" /> Lokasi</p>
                                        <p className="mt-1 text-sm font-bold text-ink">{selectedEvent.area_event}</p>
                                    </div>
                                )}
                                {selectedEvent.jumlah_pax > 0 && (
                                    <div className="p-3 border bg-paper border-line rounded-xl">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted-2 uppercase"><Users size={12} className="text-gold" /> Skala</p>
                                        <p className="mt-1 text-sm font-bold text-ink">{Number(selectedEvent.jumlah_pax).toLocaleString('id-ID')} tamu</p>
                                    </div>
                                )}
                            </div>

                            {/* Deskripsi acara */}
                            {selectedEvent.deskripsi_event && (
                                <div className="mb-5">
                                    <p className="mb-1.5 text-xs font-black tracking-wide text-gold uppercase">Tentang Acara</p>
                                    <p className="text-sm leading-relaxed text-muted whitespace-pre-line">{selectedEvent.deskripsi_event}</p>
                                </div>
                            )}

                            {/* Sorotan: entertainment & F&B */}
                            {(selectedEvent.entairtainment_event || selectedEvent.food_beverage_event) && (
                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    {selectedEvent.entairtainment_event && (
                                        <div className="flex items-start gap-3 p-3 border bg-gold-soft/50 border-line rounded-xl">
                                            <Music size={16} className="mt-0.5 text-gold shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-gold-dim">Entertainment</p>
                                                <p className="text-sm text-muted">{selectedEvent.entairtainment_event}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedEvent.food_beverage_event && (
                                        <div className="flex items-start gap-3 p-3 border bg-gold-soft/50 border-line rounded-xl">
                                            <Utensils size={16} className="mt-0.5 text-gold shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-gold-dim">Food &amp; Beverage</p>
                                                <p className="text-sm text-muted">{selectedEvent.food_beverage_event}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <a href={isLoggedIn ? `${BASE_URL}/appointment/create` : `${BASE_URL}/register`}
                                className="block w-full py-3.5 text-sm font-black text-center text-white rounded-2xl bg-gold-grad shadow-gold hover:brightness-110 transition-all">
                                🗓️ Buat Appointment Serupa
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── KONTAK ─────────────────────────────────────────── */}
            <section id="kontak" className="py-24 bg-paper bg-paper-glow">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="mb-16 text-center">
                        <p className="mb-4 text-sm font-bold tracking-widest text-gold uppercase">Hubungi Kami</p>
                        <h2 className="text-4xl font-black text-ink md:text-5xl">Kontak <span className="text-gold">Kami</span></h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
                        {[
                            { icon: <Phone size={24} />, title: 'Telepon / WhatsApp', value: '+62 853-6523-4898', sub: 'Senin – Sabtu, 09.00 – 18.00 WIB' },
                            { icon: <Mail size={24} />,  title: 'Email',              value: 'contactus@laksamanamuda.com', sub: 'Respon dalam 1x24 jam' },
                            { icon: <MapPin size={24}/>, title: 'Alamat',             value: 'Pekanbaru, Riau', sub: 'Indonesia' },
                        ].map(item => (
                            <div key={item.title} className="p-6 text-center transition-colors bg-surface border border-line rounded-2xl hover:border-gold-2">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-gold rounded-xl bg-gold-soft">{item.icon}</div>
                                <h3 className="mb-1 font-bold text-ink">{item.title}</h3>
                                <p className="text-sm font-semibold text-gold-dim">{item.value}</p>
                                <p className="mt-1 text-xs text-muted">{item.sub}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-10 text-center border bg-gradient-to-br from-gold-soft to-transparent border-line rounded-3xl">
                        <h3 className="mb-3 text-2xl font-black text-ink">Siap memulai event Anda?</h3>
                        <p className="mb-6 text-muted">Daftar sekarang dan buat appointment dengan tim Event Marketing kami.</p>
                        {isLoggedIn ? (
                            <a href={`${BASE_URL}/appointment/create`}
                                className="inline-block px-8 py-3 font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110 hover:scale-105">
                                🗓️ Buat Appointment Sekarang
                            </a>
                        ) : (
                            <div className="flex flex-col justify-center gap-4 sm:flex-row">
                                <a href={`${BASE_URL}/register`}
                                    className="px-8 py-3 font-black text-white transition-all rounded-full bg-gold-grad shadow-gold hover:brightness-110 hover:scale-105">
                                    Daftar & Buat Appointment
                                </a>
                                <a href={`${BASE_URL}/login`}
                                    className="px-8 py-3 font-bold text-gold-dim transition-all border rounded-full border-gold-2 hover:bg-gold-soft">
                                    Sudah punya akun? Masuk
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────────────────── */}
            <footer className="pt-16 pb-8 bg-paper border-t border-line">
                <div className="px-6 mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 gap-10 mb-12 md:grid-cols-4">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-surface border-2 border-gold rounded-full">
                                    <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-8 h-8" />
                                </div>
                                <span className="text-lg font-black text-ink">Laksamana <span className="text-gold">Muda</span></span>
                            </div>
                            <p className="mb-4 text-sm leading-relaxed text-muted max-w-xs">
                                Event Organizer & cafe live space bebas alkohol di Pekanbaru, Riau. Musik live, suasana nyaman, dan acara yang berkesan.
                            </p>
                            <div className="flex gap-3">
                                {[
                                    { icon: <IconInstagram />, href: '#' },
                                    { icon: <IconFacebook />,  href: '#' },
                                    { icon: <IconYoutube />,   href: '#' },
                                ].map((s, i) => (
                                    <a key={i} href={s.href}
                                        className="flex items-center justify-center w-9 h-9 text-muted transition-colors border border-line rounded-full hover:border-gold hover:text-gold-dim">
                                        {s.icon}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="mb-4 text-sm font-bold text-ink uppercase tracking-widest">Menu</h4>
                            <ul className="space-y-2">
                                {[
                                    { label: 'Home',       href: '#home' },
                                    { label: 'About',      href: '#about' },
                                    { label: 'Layanan',    href: '#layanan' },
                                    { label: 'Upcoming',   href: '#upcoming' },
                                    { label: 'Portfolio',  href: '#portfolio' },
                                    { label: 'All Events', href: `${BASE_URL}/events` },
                                ].map(l => (
                                    <li key={l.label}>
                                        <a href={l.href} className="text-sm text-muted hover:text-gold-dim transition-colors">{l.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Kontak */}
                        <div>
                            <h4 className="mb-4 text-sm font-bold text-ink uppercase tracking-widest">Kontak</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2 text-sm text-muted"><Phone size={14} className="mt-0.5 text-gold shrink-0" /> +62 853-6523-4898</li>
                                <li className="flex items-start gap-2 text-sm text-muted"><Mail size={14} className="mt-0.5 text-gold shrink-0" /> contactus@laksamanamuda.com</li>
                                <li className="flex items-start gap-2 text-sm text-muted"><MapPin size={14} className="mt-0.5 text-gold shrink-0" /> Pekanbaru, Riau, Indonesia</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 pt-8 border-t border-line md:flex-row">
                        <p className="text-xs text-muted-2">© {new Date().getFullYear()} Laksamana Muda. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <a href={isLoggedIn ? `${BASE_URL}/dashboard` : `${BASE_URL}/login`}
                                className="text-xs text-muted hover:text-gold-dim transition-colors">
                                {isLoggedIn ? 'Dashboard' : 'Client Login'}
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
