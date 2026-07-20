import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import Pagination from '@/Components/Pagination';
import StatusEventBadge from '@/Components/StatusEventBadge';
import TabEvent from '@/Components/TabEvent';
import { useDebounced } from '@/hooks/useDebounced';
import { LayoutList, Search, Wallet, Target, CalendarDays } from 'lucide-react';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tanggal = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Ringkas nilai besar agar muat di kartu: 25.000.000 → 25 jt */
const ringkas = (n) => {
    const v = Number(n || 0);
    if (v >= 1e9) return 'Rp ' + (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1).replace('.', ',') + ' M';
    if (v >= 1e6) return 'Rp ' + Math.round(v / 1e6) + ' jt';
    return rp(v);
};

function Kartu({ ikon: Ikon, label, nilai, sub }) {
    return (
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
                <Ikon size={15} className="text-[#FF2D55]" />
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{nilai}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

export default function EventSemua({
    Layout, events, ringkas: total = {}, perStatus = {}, tahapan = [], filters = {},
    tahunAda = [], kategoris = [], pegawais = [], clients = [], routes = {},
}) {
    const [cari, setCari] = useState(filters.search || '');

    const kirim = (ubah) => router.get(route(routes.self), { ...filters, search: cari, ...ubah },
        { preserveState: true, replace: true });

    const cariDitunda = useDebounced((v) => router.get(route(routes.self), { ...filters, search: v },
        { preserveState: true, replace: true }));

    const pilihCls = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none';

    return (
        <Layout>
            <Head title="Semua Event — Laksamana Muda" />

            <div className="mb-5">
                <div className="flex items-center gap-2">
                    <LayoutList size={24} className="text-[#FF2D55]" />
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Semua Event</h1>
                </div>
                <p className="mt-1 text-gray-400">
                    Seluruh siklus acara dari Lead sampai Done beserta nilai deal dan targetnya.
                </p>
            </div>

            <TabEvent aktif="semua" prefix={routes.prefix} />

            {/* Ringkasan seluruh hasil saringan */}
            <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-3">
                <Kartu ikon={CalendarDays} label="Jumlah Acara" nilai={total.jumlah ?? 0}
                    sub="sesuai saringan yang dipilih" />
                <Kartu ikon={Wallet} label="Nilai Deal" nilai={ringkas(total.nilai_deal)}
                    sub="akumulasi kesepakatan" />
                <Kartu ikon={Target} label="Target Omset" nilai={total.target_omset > 0 ? ringkas(total.target_omset) : '—'}
                    sub={total.target_omset > 0 ? 'dipasang saat perencanaan' : 'belum ada target dipasang'} />
            </div>

            {/* Sebaran per tahap — sekaligus jadi saringan cepat */}
            <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => kirim({ status: '' })}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                        ! filters.status
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    Semua tahap
                </button>
                {tahapan.map((t) => (
                    <button key={t} onClick={() => kirim({ status: t })}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                            filters.status === t
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}>
                        {t}
                        <span className={`px-1.5 rounded-full ${filters.status === t ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                            {perStatus[t] ?? 0}
                        </span>
                    </button>
                ))}
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
                <select value={filters.id_client || ''} onChange={(e) => kirim({ id_client: e.target.value })} className={pilihCls}>
                    <option value="">Semua klien</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.nama_client}</option>)}
                </select>
                <select value={filters.id_pegawai || ''} onChange={(e) => kirim({ id_pegawai: e.target.value })} className={pilihCls}>
                    <option value="">Semua PIC</option>
                    {pegawais.map((p) => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                </select>
            </div>

            {/* Tabel */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1020px]">
                        <thead>
                            <tr className="bg-[#FF2D55]">
                                {['Event', 'Tahap', 'Tanggal', 'Klien / PIC', 'Pax', 'Nilai Deal', 'Target Omset', 'Terbayar', 'To-Do'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-bold tracking-wider text-left text-white uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {events.data?.length > 0 ? events.data.map((e) => {
                                const lunas = Number(e.terbayar || 0) >= Number(e.deal_harga_event || 0) && Number(e.deal_harga_event || 0) > 0;
                                return (
                                    <tr key={e.id_event}
                                        onClick={() => router.visit(route(routes.detail, e.id_event))}
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
                                        <td className="px-5 py-4"><StatusEventBadge status={e.status_event} /></td>
                                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{tanggal(e.tgl_mulai_event)}</td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm text-gray-700">{e.client?.nama_client || 'Internal'}</p>
                                            <p className="text-xs text-gray-400">{e.pic?.nama_pegawai || '—'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-800">{e.jumlah_pax || 0}</p>
                                            {e.target_pax > 0 && <p className="text-[11px] text-gray-400">target {e.target_pax}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-800 whitespace-nowrap">{rp(e.deal_harga_event)}</td>
                                        <td className="px-5 py-4 text-sm whitespace-nowrap">
                                            {e.target_omset > 0
                                                ? <span className="font-semibold text-amber-700">{rp(e.target_omset)}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className={`px-5 py-4 text-sm font-bold whitespace-nowrap ${lunas ? 'text-green-600' : 'text-gray-700'}`}>
                                            {rp(e.terbayar)}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {e.total_tugas > 0 ? `${e.done_tugas}/${e.total_tugas}` : '—'}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                                        <LayoutList size={36} className="mx-auto mb-3 text-gray-300" />
                                        <p className="font-bold text-gray-500">Tidak ada acara sesuai saringan.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination meta={events} />
            </div>
        </Layout>
    );
}
