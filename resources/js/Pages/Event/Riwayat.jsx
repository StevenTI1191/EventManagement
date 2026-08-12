import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Pagination from '@/Components/Pagination';
import TabEvent from '@/Components/TabEvent';
import { useDebounced } from '@/hooks/useDebounced';
import {
    History, Search, Target, Wallet, Users, CalendarDays, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tanggal = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Persentase pencapaian; null bila tidak ada target untuk dibandingkan. */
const capai = (target, hasil) => (Number(target) > 0 ? Math.round((Number(hasil) / Number(target)) * 100) : null);

function Pencapaian({ persen, ringkas = false }) {
    if (persen === null) {
        return <span className="text-xs text-gray-400">Tanpa target</span>;
    }

    const [warna, Ikon] = persen >= 100 ? ['text-green-600', TrendingUp]
        : persen >= 80 ? ['text-amber-600', Minus]
        : ['text-red-500', TrendingDown];

    return (
        <span className={`inline-flex items-center gap-1 font-extrabold ${warna} ${ringkas ? 'text-xs' : 'text-sm'}`}>
            <Ikon size={ringkas ? 12 : 14} /> {persen}%
        </span>
    );
}

function Ringkasan({ ikon: Ikon, label, target, hasil, format }) {
    const persen = capai(target, hasil);

    return (
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
                <Ikon size={15} className="text-[#FF2D55]" />
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{format(hasil)}</p>
            <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">dari target {format(target)}</span>
                <Pencapaian persen={persen} ringkas />
            </div>
        </div>
    );
}

export default function EventRiwayat({
    Layout, events, ringkas = {}, filters = {}, tahunAda = [], kategoris = [], pegawais = [], jumlahTipe = {}, routes = {},
}) {
    const [cari, setCari] = useState(filters.search || '');

    const kirim = (ubah) => router.get(route(routes.self), { ...filters, search: cari, ...ubah },
        { preserveState: true, replace: true });

    const cariDitunda = useDebounced((v) => router.get(route(routes.self), { ...filters, search: v },
        { preserveState: true, replace: true }));

    const buka = (e) => router.visit(route(routes.detail, e.id_event));

    const pilihCls = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none';

    return (
        <Layout>
            <Head title="Riwayat Event — Laksamana Muda" />

            <div className="mb-5">
                <div className="flex items-center gap-2">
                    <History size={24} className="text-[#FF2D55]" />
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Riwayat Event</h1>
                </div>
                <p className="mt-1 text-gray-400">
                    Acara yang sudah pernah dijalankan, beserta perbandingan target dengan hasil sebenarnya.
                </p>
            </div>

            <TabEvent aktif="riwayat" prefix={routes.prefix} jumlah={{ riwayat: ringkas.jumlah ?? 0 }} />

            {/* Ringkasan target vs hasil untuk seluruh hasil saringan */}
            <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 lg:grid-cols-3">
                <Ringkasan ikon={Wallet} label="Omset" target={ringkas.target_omset} hasil={ringkas.realisasi_omset} format={rp} />
                <Ringkasan ikon={Users} label="Pax" target={ringkas.target_pax} hasil={ringkas.realisasi_pax}
                    format={(n) => Number(n || 0).toLocaleString('id-ID') + ' pax'} />
                <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarDays size={15} className="text-[#FF2D55]" />
                        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Acara Terlaksana</span>
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900">{ringkas.jumlah ?? 0}</p>
                    <span className="text-xs text-gray-400">sesuai saringan yang dipilih</span>
                </div>
            </div>

            {/* Pemisah asal acara — milik LM sendiri vs pesanan klien */}
            <div className="flex flex-wrap gap-2 mb-5">
                {[
                    { key: '',          label: 'Semua Acara' },
                    { key: 'Eksternal', label: 'Dari Klien' },
                    { key: 'Internal',  label: 'Internal LM' },
                ].map((t) => {
                    const on = (filters.tipe || '') === t.key;
                    return (
                        <button key={t.key || 'all'} onClick={() => kirim({ tipe: t.key })}
                            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                                on ? 'bg-gray-900 text-white border-gray-900'
                                   : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}>
                            {t.label}
                            {t.key && (
                                <span className={`px-1.5 rounded-full ${on ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                                    {jumlahTipe[t.key] ?? 0}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Saringan */}
            <div className="flex flex-wrap gap-3 p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="relative">
                    <input type="text" placeholder="Cari nama event…" value={cari}
                        onChange={(e) => { setCari(e.target.value); cariDitunda(e.target.value); }}
                        className={`${pilihCls} pl-4 pr-9 w-56`} />
                    <Search size={14} className="absolute text-gray-400 right-3 top-3" />
                </div>
                <select value={filters.tahun || ''} onChange={(e) => kirim({ tahun: e.target.value })} className={pilihCls}>
                    <option value="">Semua tahun</option>
                    {tahunAda.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filters.kategori || ''} onChange={(e) => kirim({ kategori: e.target.value })} className={pilihCls}>
                    <option value="">Semua kategori</option>
                    {kategoris.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <select value={filters.id_pegawai || ''} onChange={(e) => kirim({ id_pegawai: e.target.value })} className={pilihCls}>
                    <option value="">Semua PIC</option>
                    {pegawais.map((p) => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                </select>
            </div>

            {/* Daftar */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px]">
                        <thead>
                            <tr className="bg-[#FF2D55]">
                                {['Event', 'Tanggal', 'Klien / PIC', 'Pax', 'Omset', 'Terbayar', 'Status'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {events.data?.length > 0 ? events.data.map((e) => {
                                const belumTuntas = e.status_event === 'Penyelesaian';
                                return (
                                    <tr key={e.id_event} onClick={() => buka(e)}
                                        title="Klik untuk membuka halaman event"
                                        className="transition-colors cursor-pointer hover:bg-gray-50/60">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-800">{e.nama_event}</p>
                                            {e.kategori_event && (
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                                    {e.kategori_event}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600">{tanggal(e.tgl_mulai_event)}</td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm text-gray-700">{e.client?.nama_client || 'Internal'}</p>
                                            <p className="text-xs text-gray-400">{e.pic?.nama_pegawai || '—'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-800">{e.jumlah_pax || 0}</p>
                                            <p className="text-[11px] text-gray-400">target {e.target_pax || '—'}</p>
                                            <Pencapaian persen={capai(e.target_pax, e.jumlah_pax)} ringkas />
                                        </td>
                                        <td className="px-5 py-4">
                                            {/* Realisasi datang dari server (Event::SQL_REALISASI_OMSET):
                                                acara pesanan klien memakai nilai kesepakatan, acara
                                                internal memakai uang yang benar-benar masuk sebab
                                                kolom deal-nya mustahil terisi. */}
                                            <p className="text-sm font-bold text-gray-800">{rp(e.realisasi_omset)}</p>
                                            <p className="text-[11px] text-gray-400">target {e.target_omset ? rp(e.target_omset) : '—'}</p>
                                            <Pencapaian persen={capai(e.target_omset, e.realisasi_omset)} ringkas />
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className={`text-sm font-bold ${
                                                Number(e.terbayar || 0) >= Number(e.deal_harga_event || 0) ? 'text-green-600' : 'text-gray-700'
                                            }`}>
                                                {rp(e.terbayar)}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                                                belumTuntas ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {belumTuntas ? 'Belum tuntas' : 'Selesai'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        <History size={36} className="mx-auto mb-3 text-gray-300" />
                                        <p className="font-bold text-gray-500">Belum ada event yang pernah dijalankan.</p>
                                        <p className="mt-1 text-sm">Event akan muncul di sini setelah hari acaranya lewat.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination meta={events} />
            </div>

            <p className="mt-4 text-xs text-gray-400">
                <Target size={12} className="inline mr-1" />
                Target diambil dari tahap perencanaan. Event tanpa target ditandai "Tanpa target" dan tidak ikut menurunkan persentase.
            </p>
        </Layout>
    );
}
