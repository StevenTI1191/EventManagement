import { Head, Link, router } from '@inertiajs/react';
import { Plus, CalendarDays, MapPin, User, ListChecks, Building2, Target } from 'lucide-react';

/**
 * Dua jenis rencana. Pembedanya cuma satu — ada tidaknya klien sasaran —
 * tapi konsekuensinya beda jauh: yang internal dijalankan sendiri, yang
 * bertarget klien wajib lewat pipeline dulu.
 */
const TABS = [
    {
        key: 'internal',
        label: 'Event Internal',
        icon: Building2,
        ket: 'Acara milik PT Laksamana Muda sendiri. Tidak masuk pipeline — setelah difinalisasi langsung jadi Upcoming di menu Event.',
        kosong: 'Belum ada rencana acara internal.',
    },
    {
        key: 'klien',
        label: 'Diajukan ke Klien',
        icon: Target,
        ket: 'Konsep yang disiapkan untuk ditawarkan ke klien tertentu. Saat diajukan, rencana masuk pipeline di kolom Lead.',
        kosong: 'Belum ada rencana yang menyasar klien.',
    },
];

function ProgressBar({ value }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const color = v >= 100 ? 'bg-green-500' : v > 0 ? 'bg-[#FF2D55]' : 'bg-gray-200';
    return (
        <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
            <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
        </div>
    );
}

const formatTgl = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

export default function PlanningIndex({ Layout, events = [], routes, jenis = 'internal', jumlah = {} }) {
    const tabAktif = TABS.find((t) => t.key === jenis) || TABS[0];

    const gantiTab = (key) => router.get(route(routes.index), { jenis: key }, { preserveState: true, replace: true });

    return (
        <Layout>
            <Head title="Planning Event — Laksamana Muda" />

            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <ListChecks size={24} className="text-[#FF2D55]" />
                        <h1 className="text-3xl font-extrabold text-gray-900">Planning Event</h1>
                    </div>
                    <p className="mt-1 font-medium text-gray-500">Rencanakan persiapan event beserta to-do list per kategori sebelum difinalisasi.</p>
                </div>
                <Link href={route(routes.create, { jenis })}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF2D55] text-white font-bold rounded-2xl hover:bg-[#e02249] transition-colors shadow-lg shadow-[#FF2D55]/30">
                    <Plus size={18} strokeWidth={3} /> Tambah Event Planning
                </Link>
            </div>

            {/* Pemisah jenis rencana */}
            <div className="flex flex-wrap gap-2 mb-3">
                {TABS.map((t) => {
                    const aktif = jenis === t.key;
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => gantiTab(t.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                                aktif
                                    ? 'bg-[#FF2D55] text-white border-[#FF2D55] shadow-md shadow-[#FF2D55]/20'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}>
                            <Icon size={15} />
                            {t.label}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${aktif ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                                {jumlah[t.key] ?? 0}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="mb-6 text-sm text-gray-400">{tabAktif.ket}</p>

            {events.length === 0 ? (
                <div className="py-20 text-center text-gray-400 bg-white border border-gray-100 rounded-3xl">
                    <ListChecks size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-bold text-gray-500">{tabAktif.kosong}</p>
                    <p className="text-sm">Klik "Tambah Event Planning" untuk memulai.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {events.map((e) => (
                        <Link key={e.id_event} href={route(routes.show, e.id_event)}
                            className="block p-5 transition-all bg-white border border-gray-100 shadow-sm rounded-3xl hover:shadow-md hover:border-[#FF2D55]/30">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <h2 className="font-extrabold leading-tight text-gray-900">{e.nama_event}</h2>
                                {e.kategori_event && (
                                    <span className="px-2 py-0.5 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full shrink-0">
                                        {e.kategori_event}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                                <p className="flex items-center gap-2"><CalendarDays size={13} /> {formatTgl(e.tgl_mulai_event)}</p>
                                {e.client && <p className="flex items-center gap-2"><User size={13} /> {e.client}</p>}
                                {e.area_event && <p className="flex items-center gap-2"><MapPin size={13} /> {e.area_event}</p>}
                            </div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Progres To-Do</span>
                                <span className="text-xs font-extrabold text-gray-700">{e.progress}% · {e.done}/{e.total}</span>
                            </div>
                            <ProgressBar value={e.progress} />
                        </Link>
                    ))}
                </div>
            )}
        </Layout>
    );
}
