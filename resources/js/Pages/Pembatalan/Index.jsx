import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Ban, Building2, CalendarDays, CheckCircle2, XCircle, X, Check } from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const tanggal = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const badgeStatus = (s) => ({
    'Diajukan':          'bg-amber-100 text-amber-700',
    'Disetujui EM':      'bg-blue-100 text-blue-700',
    'Disetujui Finance': 'bg-indigo-100 text-indigo-700',
    'Selesai':           'bg-emerald-100 text-emerald-700',
    'Ditolak':           'bg-red-100 text-red-600',
}[s] || 'bg-gray-100 text-gray-600');

// Tiga tahap persetujuan berurutan.
const TAHAP = [
    { peran: 'EventMarketing', label: 'Event Marketing', olehKey: 'penyetuju_em',        padaKey: 'em_pada' },
    { peran: 'Finance',        label: 'Finance',         olehKey: 'penyetuju_finance',   padaKey: 'finance_pada' },
    { peran: 'Manajemen',      label: 'Manajemen',       olehKey: 'penyetuju_manajemen', padaKey: 'manajemen_pada' },
];

export default function PembatalanIndex({ Layout, pengajuan = [], peran, routes = {} }) {
    const { flash } = usePage().props;
    const [aksi, setAksi] = useState(null); // { p, tipe: 'setujui' | 'tolak' }
    const [catatan, setCatatan] = useState('');
    const [refund, setRefund] = useState(0);
    const [proses, setProses] = useState(false);

    const bukaSetujui = (p) => { setRefund(Number(p.refund_estimasi || 0)); setCatatan(''); setAksi({ p, tipe: 'setujui' }); };
    const bukaTolak = (p) => { setCatatan(''); setAksi({ p, tipe: 'tolak' }); };

    const isFinance = peran === 'Finance';

    const submit = () => {
        if (proses) return;
        if (aksi.tipe === 'tolak' && catatan.trim().length < 5) return;
        if (aksi.tipe === 'setujui' && isFinance && (refund === '' || Number(refund) < 0 || Number(refund) > Number(aksi.p.refund_estimasi || 0))) return;
        setProses(true);
        const data = aksi.tipe === 'tolak' ? { catatan } : (isFinance ? { refund_nominal: Number(refund) } : {});
        const url = aksi.tipe === 'setujui' ? route(routes.setujui, aksi.p.id) : route(routes.tolak, aksi.p.id);
        router.patch(url, data, {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        });
    };

    const menunggu = pengajuan.filter((p) => p.giliran === peran).length;

    return (
        <Layout>
            <Head title="Pengajuan Pembatalan - Laksamana Muda" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <Ban size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Pengajuan Pembatalan</h1>
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Persetujuan berurutan: <b>Event Marketing → Finance → Manajemen</b>. Setiap pihak menyetujui pada gilirannya;
                    Finance menetapkan nominal refund, Manajemen menyetujui terakhir dan refund diproses.
                </p>

                {flash?.success && <div className="p-3 mb-4 text-sm font-medium text-green-700 border border-green-200 rounded-xl bg-green-50">{flash.success}</div>}
                {flash?.error && <div className="p-3 mb-4 text-sm font-medium text-red-700 border border-red-200 rounded-xl bg-red-50">{flash.error}</div>}

                <div className="inline-flex px-4 py-2 mb-5 text-sm font-bold border rounded-xl bg-amber-50 border-amber-200 text-amber-700">
                    {menunggu} pengajuan menunggu persetujuan Anda
                </div>

                {pengajuan.length === 0 ? (
                    <div className="py-20 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <Ban size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Belum ada pengajuan pembatalan.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pengajuan.map((p) => {
                            const giliranSaya = p.giliran === peran;
                            return (
                            <div key={p.id} className={`p-5 bg-white border shadow-sm rounded-2xl ${giliranSaya ? 'border-[#FF2D55]/40 ring-1 ring-[#FF2D55]/10' : 'border-gray-100'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-extrabold text-gray-900">{p.event?.nama_event || '—'}</h2>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeStatus(p.status)}`}>{p.status}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Building2 size={12} />{p.event?.client?.perusahaan_client || p.event?.client?.nama_client || '—'}</span>
                                            <span className="flex items-center gap-1"><CalendarDays size={12} />{tanggal(p.event?.tgl_mulai_event)}</span>
                                            <span>Diajukan {tanggal(p.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">{p.refund_nominal != null && Number(p.refund_nominal) >= 0 && p.finance_pada ? 'Refund Ditetapkan' : 'Perkiraan Refund'}</p>
                                        <p className="text-lg font-extrabold text-[#FF2D55]">{rupiah(p.finance_pada ? p.refund_nominal : p.refund_estimasi)}</p>
                                    </div>
                                </div>

                                <div className="p-3 mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Alasan Klien</span>
                                    <p className="mt-1">{p.alasan}</p>
                                </div>

                                {/* Progres tiga tahap */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {TAHAP.map((t, i) => {
                                        const oleh = p[t.olehKey];
                                        const selesai = !!p[t.padaKey];
                                        const sedang = p.giliran === t.peran && p.status !== 'Ditolak' && p.status !== 'Selesai';
                                        return (
                                            <div key={t.peran} className="flex items-center gap-2">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                                                    selesai ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    : sedang ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                                                }`}>
                                                    {selesai ? <Check size={12} /> : <span className="w-3 text-center">{i + 1}</span>}
                                                    {t.label}
                                                    {selesai && oleh?.nama_pegawai && <span className="font-normal">· {oleh.nama_pegawai}</span>}
                                                </div>
                                                {i < TAHAP.length - 1 && <span className="text-gray-300">→</span>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {p.status === 'Ditolak' && (
                                    <p className="mt-3 text-xs font-bold text-red-600">❌ Ditolak {p.ditolak_peran ? `(${p.ditolak_peran})` : ''}: {p.catatan_tolak}</p>
                                )}
                                {p.status === 'Selesai' && (
                                    <p className="mt-3 text-xs font-bold text-emerald-600">✅ Selesai — refund {rupiah(p.refund_nominal)} diproses.</p>
                                )}

                                {giliranSaya && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => bukaSetujui(p)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                                            <CheckCircle2 size={15} /> Setujui{isFinance ? ' & tetapkan refund' : ''}
                                        </button>
                                        <button onClick={() => bukaTolak(p)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                                            <XCircle size={15} /> Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal setujui / tolak */}
            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'setujui' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="mb-3 text-xs text-gray-500">{aksi.p.event?.nama_event}</p>

                        {aksi.tipe === 'setujui' && isFinance && (
                            <>
                                <div className="p-3 mb-3 text-xs border rounded-xl bg-gray-50 border-gray-200 text-gray-600">
                                    Total sudah dibayar klien: <b className="text-gray-900">{rupiah(aksi.p.refund_estimasi)}</b>
                                </div>
                                <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    Nominal refund <span className="text-gray-400 normal-case font-normal">(boleh dikurangi)</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute -translate-y-1/2 left-3 top-1/2 text-sm font-bold text-gray-400">Rp</span>
                                    <input type="number" min={0} max={aksi.p.refund_estimasi} step={1000} value={refund}
                                        onChange={(e) => setRefund(e.target.value)}
                                        className="w-full py-2.5 pl-9 pr-3 text-sm font-bold text-gray-800 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none" />
                                </div>
                                <p className="mt-1 mb-4 text-[10px] text-gray-400">Terbilang: {rupiah(Number(refund) || 0)}. Manajemen akan menyetujui terakhir sebelum refund diproses.</p>
                            </>
                        )}

                        {aksi.tipe === 'setujui' && !isFinance && (
                            <div className={`p-3 mb-4 text-xs border rounded-xl ${peran === 'Manajemen' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                {peran === 'Manajemen'
                                    ? <>Persetujuan akhir. Setelah ini, refund <b>{rupiah(aksi.p.refund_nominal)}</b> dicatat di buku kas dan acara ditandai <b>Batal</b>. Tindakan permanen.</>
                                    : 'Pengajuan diteruskan ke Finance untuk penetapan nominal refund.'}
                            </div>
                        )}

                        {aksi.tipe === 'tolak' && (
                            <>
                                <div className="p-3 mb-4 text-xs border rounded-xl bg-red-50 border-red-200 text-red-700">
                                    Klien akan diberi tahu bahwa pengajuannya ditolak. Sertakan alasan yang jelas.
                                </div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    Alasan penolakan <span className="text-red-500 normal-case font-normal">* wajib</span>
                                </label>
                                <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
                                    placeholder="Alasan penolakan (min. 5 karakter)…"
                                    className="w-full px-4 py-3 mb-4 text-sm text-gray-800 border border-gray-200 resize-none rounded-xl focus:border-red-400 focus:outline-none" />
                            </>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={submit}
                                disabled={proses
                                    || (aksi.tipe === 'tolak' && catatan.trim().length < 5)
                                    || (aksi.tipe === 'setujui' && isFinance && (refund === '' || Number(refund) < 0 || Number(refund) > Number(aksi.p.refund_estimasi || 0)))}
                                className={`flex-1 py-2.5 text-sm font-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${aksi.tipe === 'setujui' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {proses ? 'Memproses…' : (aksi.tipe === 'setujui' ? 'Ya, Setujui' : 'Ya, Tolak')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
