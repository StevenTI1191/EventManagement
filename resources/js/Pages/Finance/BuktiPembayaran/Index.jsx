import FinanceLayout from '@/Layouts/FinanceLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, Eye, X, AlertCircle } from 'lucide-react';
import { useDebounced } from '@/hooks/useDebounced';

const fmt = (v) => v
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
    : '-';

const fmtTgl = (tgl) => tgl
    ? new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

export default function FinanceBuktiIndex({ buktiList, stats, filters }) {
    const { auth, flash } = usePage().props;
    const [search, setSearch]           = useState(filters?.search || '');
    const [activeStatus, setActiveStatus] = useState(filters?.status || 'all');
    const [previewModal, setPreviewModal] = useState(null);   // bukti file preview
    const [verifyModal, setVerifyModal]   = useState(null);   // bukti yg akan diverifikasi

    const formVerify = useForm({ status: '', catatan_finance: '' });

    const debouncedSearch = useDebounced((val) => {
        router.get(route('finance.bukti.index'), { search: val, status: activeStatus }, { preserveState: true, replace: true });
    });

    const handleSearch = (val) => {
        setSearch(val);
        debouncedSearch(val);
    };

    const handleStatusFilter = (val) => {
        setActiveStatus(val);
        router.get(route('finance.bukti.index'), { search, status: val }, { preserveState: true, replace: true });
    };

    const openVerify = (bukti, status) => {
        setVerifyModal(bukti);
        formVerify.setData({ status, catatan_finance: '' });
    };

    const submitVerify = (e) => {
        e.preventDefault();
        formVerify.patch(route('finance.bukti.verifikasi', verifyModal.id), {
            onSuccess: () => setVerifyModal(null),
        });
    };

    const getStatusBadge = (status) => {
        if (status === 'Diverifikasi') return { cls: 'bg-green-50 text-green-600',   icon: <CheckCircle size={12} />, label: 'Diverifikasi' };
        if (status === 'Ditolak')      return { cls: 'bg-red-50 text-red-500',       icon: <XCircle size={12} />,    label: 'Ditolak' };
        return                                { cls: 'bg-yellow-50 text-yellow-600', icon: <Clock size={12} />,      label: 'Menunggu' };
    };

    const isImage = (path) => /\.(jpg|jpeg|png|webp)$/i.test(path);

    const statusTabs = [
        { key: 'all',          label: 'Semua',       count: stats.menunggu + stats.diverifikasi + stats.ditolak },
        { key: 'Menunggu',     label: 'Menunggu',    count: stats.menunggu },
        { key: 'Diverifikasi', label: 'Diverifikasi',count: stats.diverifikasi },
        { key: 'Ditolak',      label: 'Ditolak',     count: stats.ditolak },
    ];

    return (
        <FinanceLayout>
            <Head title="Bukti Pembayaran - Finance" />

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Bukti Pembayaran Client</h1>
                <p className="mt-1 font-medium text-gray-500">Verifikasi bukti transfer yang dikirimkan client.</p>
            </div>

            {/* FLASH */}
            {flash?.success && (
                <div className="p-4 mb-6 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">
                    ✅ {flash.success}
                </div>
            )}

            {/* STATS CARDS */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-5 bg-yellow-50 border border-yellow-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1"><Clock size={18} className="text-yellow-500" /><p className="text-xs font-bold text-yellow-600">Menunggu Verifikasi</p></div>
                    <p className="text-3xl font-extrabold text-yellow-600">{stats.menunggu}</p>
                </div>
                <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1"><CheckCircle size={18} className="text-green-500" /><p className="text-xs font-bold text-green-600">Diverifikasi</p></div>
                    <p className="text-3xl font-extrabold text-green-600">{stats.diverifikasi}</p>
                </div>
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1"><XCircle size={18} className="text-red-500" /><p className="text-xs font-bold text-red-500">Ditolak</p></div>
                    <p className="text-3xl font-extrabold text-red-500">{stats.ditolak}</p>
                </div>
            </div>

            {/* FILTER */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map(tab => (
                        <button key={tab.key} onClick={() => handleStatusFilter(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                                activeStatus === tab.key
                                    ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF2D55]/50'
                            }`}>
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeStatus === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                {/* Search */}
                <div className="relative max-w-xs">
                    <Search size={14} className="absolute text-gray-400 left-3 top-2.5" />
                    <input type="text" placeholder="Cari event / client..." value={search}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none" />
                </div>
            </div>

            {/* TABEL */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-10 px-4 py-3 text-xs font-bold text-left text-white uppercase">No</th>
                            <th className="px-4 py-3 text-xs font-bold text-left text-white uppercase">Client</th>
                            <th className="px-4 py-3 text-xs font-bold text-left text-white uppercase">Event</th>
                            <th className="px-4 py-3 text-xs font-bold text-left text-white uppercase">Nominal</th>
                            <th className="px-4 py-3 text-xs font-bold text-left text-white uppercase">Keterangan</th>
                            <th className="px-4 py-3 text-xs font-bold text-left text-white uppercase">Tanggal</th>
                            <th className="px-4 py-3 text-xs font-bold text-center text-white uppercase">Bukti</th>
                            <th className="px-4 py-3 text-xs font-bold text-center text-white uppercase">Status</th>
                            <th className="px-4 py-3 text-xs font-bold text-center text-white uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {buktiList.data?.length > 0 ? buktiList.data.map((b, i) => {
                            const badge = getStatusBadge(b.status);
                            return (
                                <tr key={b.id} className="transition-colors hover:bg-gray-50/60">
                                    <td className="px-4 py-4 text-sm text-gray-400">{(buktiList.from - 1) + i + 1}</td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-bold text-gray-800">{b.nama_client}</p>
                                        <p className="text-xs text-gray-400">{b.perusahaan}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-semibold text-gray-800 max-w-[180px] truncate">{b.nama_event}</p>
                                        <p className="text-xs text-gray-400">{fmtTgl(b.tgl_event)}</p>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-bold text-green-600">{fmt(b.nominal)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 max-w-[140px] truncate">{b.keterangan || '-'}</td>
                                    <td className="px-4 py-4 text-xs text-gray-400">{fmtTgl(b.created_at)}</td>

                                    {/* Bukti File */}
                                    <td className="px-4 py-4 text-center">
                                        <button onClick={() => setPreviewModal(b)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                            <Eye size={12} /> Lihat
                                        </button>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${badge.cls}`}>
                                            {badge.icon} {badge.label}
                                        </span>
                                        {b.catatan_finance && (
                                            <p className="mt-1 text-[10px] text-gray-400 max-w-[120px] truncate" title={b.catatan_finance}>
                                                {b.catatan_finance}
                                            </p>
                                        )}
                                    </td>

                                    {/* Aksi */}
                                    <td className="px-4 py-4">
                                        {b.status === 'Menunggu' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openVerify(b, 'Diverifikasi')}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                                                    <CheckCircle size={11} /> Verifikasi
                                                </button>
                                                <button onClick={() => openVerify(b, 'Ditolak')}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                                                    <XCircle size={11} /> Tolak
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openVerify(b, b.status === 'Diverifikasi' ? 'Ditolak' : 'Diverifikasi')}
                                                    className="px-3 py-1.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                                    Ubah Status
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={9} className="px-6 py-20 text-center text-gray-400">
                                    <AlertCircle size={36} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">Belum ada bukti pembayaran.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination meta={buktiList} />
            </div>

            {/* MODAL PREVIEW BUKTI */}
            {previewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setPreviewModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="font-extrabold text-gray-900">Bukti Pembayaran</h3>
                                <p className="text-xs text-gray-400">{previewModal.nama_client} — {previewModal.nama_event}</p>
                            </div>
                            <button onClick={() => setPreviewModal(null)} className="p-2 rounded-xl hover:bg-gray-100">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5">
                            {/* Info */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { label: 'Nominal',    value: fmt(previewModal.nominal) },
                                    { label: 'Tanggal',    value: fmtTgl(previewModal.created_at) },
                                    { label: 'Keterangan', value: previewModal.keterangan || '-' },
                                    { label: 'Status',     value: previewModal.status },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-gray-50 rounded-xl">
                                        <p className="mb-0.5 text-[10px] font-bold text-gray-400 uppercase">{item.label}</p>
                                        <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* File Preview */}
                            {previewModal.file_bukti && (
                                <div className="mb-4">
                                    <p className="mb-2 text-xs font-bold text-gray-400 uppercase">File Bukti</p>
                                    {isImage(previewModal.file_bukti) ? (
                                        <img src={`/${previewModal.file_bukti}`}
                                            alt="Bukti Pembayaran"
                                            className="w-full rounded-xl border border-gray-100 object-contain max-h-80" />
                                    ) : (
                                        <a href={`/${previewModal.file_bukti}`} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
                                            <Eye size={20} className="text-blue-500" />
                                            <span className="text-sm font-bold text-blue-600">Buka File PDF</span>
                                        </a>
                                    )}
                                </div>
                            )}

                            {previewModal.catatan_finance && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="mb-1 text-[10px] font-bold text-red-500 uppercase">Catatan Finance</p>
                                    <p className="text-sm text-red-700">{previewModal.catatan_finance}</p>
                                </div>
                            )}

                            {/* Aksi cepat dari modal */}
                            {previewModal.status === 'Menunggu' && (
                                <div className="flex gap-3 mt-5">
                                    <button onClick={() => { setPreviewModal(null); openVerify(previewModal, 'Diverifikasi'); }}
                                        className="flex-1 py-2.5 text-sm font-bold text-green-600 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100">
                                        ✅ Verifikasi
                                    </button>
                                    <button onClick={() => { setPreviewModal(null); openVerify(previewModal, 'Ditolak'); }}
                                        className="flex-1 py-2.5 text-sm font-bold text-red-500 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100">
                                        ❌ Tolak
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VERIFIKASI */}
            {verifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setVerifyModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="font-extrabold text-gray-900">
                                    {formVerify.data.status === 'Diverifikasi' ? '✅ Verifikasi Pembayaran' : '❌ Tolak Pembayaran'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">{verifyModal.nama_client} — {verifyModal.nama_event}</p>
                            </div>
                            <button onClick={() => setVerifyModal(null)} className="p-2 rounded-xl hover:bg-gray-100">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Info ringkas */}
                        <div className="p-4 mb-5 bg-gray-50 rounded-xl">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">Nominal</span>
                                <span className="font-bold text-gray-800">{fmt(verifyModal.nominal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Keterangan</span>
                                <span className="font-semibold text-gray-700">{verifyModal.keterangan || '-'}</span>
                            </div>
                        </div>

                        <form onSubmit={submitVerify} className="space-y-4">
                            {/* Ubah status jika perlu */}
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Status</label>
                                <select value={formVerify.data.status}
                                    onChange={e => formVerify.setData('status', e.target.value)}
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50">
                                    <option value="Diverifikasi">✅ Diverifikasi</option>
                                    <option value="Ditolak">❌ Ditolak</option>
                                    <option value="Menunggu">🕐 Kembalikan ke Menunggu</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">
                                    Catatan untuk Client {formVerify.data.status === 'Ditolak' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea rows={3}
                                    value={formVerify.data.catatan_finance}
                                    onChange={e => formVerify.setData('catatan_finance', e.target.value)}
                                    placeholder={formVerify.data.status === 'Ditolak'
                                        ? 'Jelaskan alasan penolakan...'
                                        : 'Catatan opsional untuk client...'}
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 resize-none focus:border-[#FF2D55] focus:outline-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setVerifyModal(null)}
                                    className="flex-1 py-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={formVerify.processing}
                                    className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-colors ${
                                        formVerify.data.status === 'Ditolak'
                                            ? 'bg-red-500 hover:bg-red-600'
                                            : 'bg-[#FF2D55] hover:bg-red-600'
                                    }`}>
                                    {formVerify.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </FinanceLayout>
    );
}
