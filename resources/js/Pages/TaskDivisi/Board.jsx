import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ClipboardList, Building2, CalendarDays, MapPin, Users, User, ArrowRight } from 'lucide-react';

const tanggal = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TABS = [
    { key: 'all',       label: 'Semua' },
    { key: 'Internal',  label: 'Internal' },
    { key: 'Eksternal', label: 'Event Klien' },
];

export default function TaskDivisiBoard({ Layout, events = [], routes = {} }) {
    const [tab, setTab] = useState('all');

    const terfilter = tab === 'all' ? events : events.filter((e) => e.tipe_event === tab);

    // Kartu internal yang masih Planning diarahkan ke papan Planning (punya
    // template), selain itu ke papan To-Do event.
    const linkPapan = (e) =>
        e.tipe_event === 'Internal' && e.status_event === 'Planning' && routes.planning
            ? route(routes.planning, e.id_event)
            : route(routes.todo, e.id_event);

    const hitung = (key) => (key === 'all' ? events.length : events.filter((e) => e.tipe_event === key).length);

    return (
        <Layout>
            <Head title="Task Divisi — Laksamana Muda" />

            <div className="mb-6">
                <div className="flex items-center gap-2">
                    <ClipboardList size={24} className="text-[#FF2D55]" />
                    <h1 className="text-3xl font-extrabold text-gray-900">Task Divisi</h1>
                    <span className="px-3 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-full">
                        {events.length} event
                    </span>
                </div>
                <p className="mt-1 font-medium text-gray-500">
                    Event yang perlu dikerjakan divisi — internal yang direncanakan &amp; event klien yang sudah berjalan.
                    Klik kartu untuk membuka papan to-do-nya.
                </p>
            </div>

            {/* Tab tipe */}
            <div className="flex gap-2 mb-6">
                {TABS.map((t) => {
                    const aktif = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
                                aktif
                                    ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {t.label}
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${aktif ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {hitung(t.key)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {terfilter.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-3xl">
                    <ClipboardList size={40} className="mb-3 text-gray-300" />
                    <p className="text-lg font-bold text-gray-500">Belum ada event untuk dikerjakan</p>
                    <p className="mt-1 text-sm text-gray-400">Event muncul di sini saat internal masuk Planning atau event klien sudah Upcoming.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {terfilter.map((e) => {
                        const pct = e.total > 0 ? Math.min(100, Math.round((e.done / e.total) * 100)) : 0;
                        const internal = e.tipe_event === 'Internal';
                        return (
                            <Link
                                key={e.id_event}
                                href={linkPapan(e)}
                                className="flex flex-col p-5 transition-all bg-white border border-gray-100 shadow-sm group rounded-2xl hover:shadow-md hover:border-gray-300"
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <h3 className="flex-1 text-sm font-bold leading-snug text-gray-900">{e.nama_event}</h3>
                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-full shrink-0 ${
                                        internal ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                        {internal ? 'Internal' : 'Klien'}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                                    {!internal && (
                                        <p className="flex items-center gap-1.5">
                                            <Building2 size={12} className="shrink-0" />
                                            <span className="truncate">{e.client || 'Tanpa klien'}</span>
                                        </p>
                                    )}
                                    <p className="flex items-center gap-1.5">
                                        <CalendarDays size={12} className="shrink-0" /> {tanggal(e.tgl_mulai_event)}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <MapPin size={12} className="shrink-0" />
                                        <span className="truncate">{e.area_event || '—'}</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Users size={12} className="shrink-0" /> {e.jumlah_pax ? `${e.jumlah_pax} tamu` : '—'}
                                    </p>
                                    {e.pic && (
                                        <p className="flex items-center gap-1.5">
                                            <User size={12} className="shrink-0" />
                                            <span className="truncate">{e.pic}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Progres to-do */}
                                <div className="mt-auto">
                                    <div className="flex items-center justify-between mb-1 text-[11px] font-bold">
                                        <span className="text-gray-500">Progres to-do</span>
                                        <span className="text-gray-700">{e.done}/{e.total} · {pct}%</span>
                                    </div>
                                    <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : pct >= 50 ? '#eab308' : '#FF2D55' }}
                                        />
                                    </div>
                                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-[#FF2D55] group-hover:gap-2 transition-all">
                                        Buka papan to-do <ArrowRight size={13} />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </Layout>
    );
}
