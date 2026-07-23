import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { XCircle, CheckCircle2, Building2, CalendarDays, X, Ban } from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const tanggal = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const badgeStatus = (s) => ({
    Diajukan:  'bg-amber-100 text-amber-700',
    Disetujui: 'bg-blue-100 text-blue-700',
    Ditolak:   'bg-red-100 text-red-600',
    Selesai:   'bg-emerald-100 text-emerald-700',
}[s] || 'bg-gray-100 text-gray-600');

export default function ManajemenPembatalanIndex({ pengajuan = [], counts = {} }) {
    const { flash } = usePage().props;
    const [aksi, setAksi] = useState(null);       // { p, tipe: 'setujui' | 'tolak' }
    const [catatan, setCatatan] = useState('');
    const [proses, setProses] = useState(false);

    const buka = (p, tipe) => { setCatatan(''); setAksi({ p, tipe }); };

    const submit = () => {
        if (proses) return;
        if (aksi.tipe === 'tolak' && catatan.trim().length < 5) return;
        setProses(true);
        const url = aksi.tipe === 'setujui'
            ? route('manajemen.pembatalan.setujui', aksi.p.id)
            : route('manajemen.pembatalan.tolak', aksi.p.id);
        router.patch(url, { catatan }, {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        });
    };

    return (
        <ManajemenLayout>
            <Head title="Pengajuan Pembatalan - Laksamana Muda" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <Ban size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Pengajuan Pembatalan</h1>
                </div>
                <p className="mb-6 text-sm text-gray-500">
                    Tinjau pengajuan pembatalan &amp; refund dari klien. Yang disetujui diteruskan ke Finance untuk diproses.
                </p>

                {flash?.success && <div className="p-3 mb-4 text-sm font-medium text-green-700 border border-green-200 rounded-xl bg-green-50">{flash.success}</div>}
                {flash?.error && <div className="p-3 mb-4 text-sm font-medium text-red-700 border border-red-200 rounded-xl bg-red-50">{flash.error}</div>}

                <div className="flex gap-3 mb-6">
                    <div className="px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Menunggu Tinjauan</p>
                        <p className="text-2xl font-extrabold text-amber-600">{counts.diajukan ?? 0}</p>
                    </div>
                    <div className="px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Disetujui (menunggu Finance)</p>
                        <p className="text-2xl font-extrabold text-blue-600">{counts.disetujui ?? 0}</p>
                    </div>
                </div>

                {pengajuan.length === 0 ? (
                    <div className="py-20 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <Ban size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Belum ada pengajuan pembatalan.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pengajuan.map((p) => (
                            <div key={p.id} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
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
                                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Perkiraan Refund</p>
                                        <p className="text-lg font-extrabold text-[#FF2D55]">{rupiah(p.refund_estimasi)}</p>
                                    </div>
                                </div>

                                <div className="p-3 mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Alasan Klien</span>
                                    <p className="mt-1">{p.alasan}</p>
                                </div>

                                {p.catatan_manajemen && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        <b>Catatan Manajemen:</b> {p.catatan_manajemen}
                                        {p.penyetuju?.nama_pegawai && <> — {p.penyetuju.nama_pegawai}</>}
                                    </p>
                                )}

                                {p.status === 'Diajukan' && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => buka(p, 'setujui')}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                                            <CheckCircle2 size={15} /> Setujui
                                        </button>
                                        <button onClick={() => buka(p, 'tolak')}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                                            <XCircle size={15} /> Tolak
                                        </button>
                                    </div>
                                )}
                                {p.status === 'Disetujui' && (
                                    <p className="mt-3 text-xs font-bold text-blue-600">⏳ Menunggu Finance memproses refund.</p>
                                )}
                                {p.status === 'Selesai' && (
                                    <p className="mt-3 text-xs font-bold text-emerald-600">✅ Refund {rupiah(p.refund_nominal)} telah diproses ({tanggal(p.diproses_pada)}).</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal setujui / tolak */}
            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'setujui' ? 'Setujui Pembatalan' : 'Tolak Pengajuan'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="mb-3 text-xs text-gray-500">{aksi.p.event?.nama_event}</p>

                        <div className={`p-3 mb-4 text-xs border rounded-xl ${aksi.tipe === 'setujui' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {aksi.tipe === 'setujui'
                                ? 'Pengajuan diteruskan ke Finance untuk pemrosesan refund. Acara belum dibatalkan sampai Finance memproses.'
                                : 'Klien akan diberi tahu bahwa pengajuannya ditolak. Sertakan alasan yang jelas.'}
                        </div>

                        <label className="block mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                            Catatan {aksi.tipe === 'tolak' ? <span className="text-red-500 normal-case font-normal">* wajib</span> : <span className="normal-case font-normal text-gray-400">(opsional)</span>}
                        </label>
                        <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
                            placeholder={aksi.tipe === 'tolak' ? 'Alasan penolakan (min. 5 karakter)…' : 'Catatan untuk Finance (opsional)…'}
                            className="w-full px-4 py-3 text-sm text-gray-800 border border-gray-200 resize-none rounded-xl focus:border-gray-400 focus:outline-none" />

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={submit} disabled={proses || (aksi.tipe === 'tolak' && catatan.trim().length < 5)}
                                className={`flex-1 py-2.5 text-sm font-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${aksi.tipe === 'setujui' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {proses ? 'Memproses…' : (aksi.tipe === 'setujui' ? 'Ya, Setujui' : 'Ya, Tolak')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}
