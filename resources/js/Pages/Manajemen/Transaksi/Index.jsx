import ManajemenLayout from '@/Layouts/ManajemenLayout';
import Pagination from '@/Components/Pagination';
import RupiahInput from '@/Components/RupiahInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X, Pencil } from 'lucide-react';

export default function TransaksiIndex({ auth, events, filters = {} }) {
    const [expandedEvent, setExpandedEvent] = useState(null);
    const [expandedTab, setExpandedTab]     = useState('pembayaran');
    const [modalBayar, setModalBayar]       = useState(null);
    const [modalItem, setModalItem]         = useState(null);
    const [deleteModal, setDeleteModal]     = useState(null); // { type: 'bayar'|'item', id }
    const [deleting, setDeleting]           = useState(false);

    const [filterData, setFilterData] = useState({
        bulan:  filters.bulan  || '',
        tahun:  filters.tahun  || '',
        status: filters.status || '',
        sort:   filters.sort   || 'tanggal',
        dir:    filters.dir    || 'desc',
        search: filters.search || '',
    });

    const bulanList = [
        { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' },   { value: '4', label: 'April' },
        { value: '5', label: 'Mei' },     { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' },    { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' },{ value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },{ value: '12', label: 'Desember' },
    ];
    const tahunList = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 2 + i));

    const applyFilter = (updated) => {
        setFilterData(updated);
        router.get(route('manajemen.transaksi.index'), updated, { preserveState: true, replace: true });
    };

    const resetFilter = () => {
        const fresh = { bulan: '', tahun: '', status: '', sort: 'tanggal', dir: 'desc', search: '' };
        setFilterData(fresh);
        router.get(route('manajemen.transaksi.index'), {}, { preserveState: true, replace: true });
    };

    const toggleSort = (field) => {
        const updated = filterData.sort === field
            ? { ...filterData, dir: filterData.dir === 'desc' ? 'asc' : 'desc' }
            : { ...filterData, sort: field, dir: 'desc' };
        applyFilter(updated);
    };

    const formBayar = useForm({
        id_event: '', nominal: '', tgl_bayar: '', keterangan: '', bukti_file: null,
    });

    const formItem = useForm({
        id_event: '', tipe: 'Pengeluaran', nama_item: '', qty: 1, harga: '', keterangan: '',
    });

    const formatRupiah = (angka) => {
        if (!angka) return 'Rp 0';
        return 'Rp ' + Number(angka).toLocaleString('id-ID');
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const handleBayar = (e) => {
        e.preventDefault();
        formBayar.post(route('manajemen.transaksi.store'), {
            forceFormData: true,
            onSuccess: () => { formBayar.reset(); setModalBayar(null); },
        });
    };

    const handleItem = (e) => {
        e.preventDefault();
        formItem.post(route('manajemen.transaksi.item.store'), {
            onSuccess: () => { formItem.reset(); setModalItem(null); },
        });
    };

    const handleDeleteBayar = (id) => setDeleteModal({ type: 'bayar', id });
    const handleDeleteItem  = (id) => setDeleteModal({ type: 'item', id });
    const confirmDelete = () => {
        if (deleting) return;
        setDeleting(true);
        const routeName = deleteModal.type === 'bayar'
            ? 'manajemen.transaksi.destroy'
            : 'manajemen.transaksi.item.destroy';
        router.delete(route(routeName, deleteModal.id), {
            preserveScroll: true,
            onFinish: () => { setDeleteModal(null); setDeleting(false); },
        });
    };

    const toggleExpand = (id) => {
        if (expandedEvent === id) {
            setExpandedEvent(null);
        } else {
            setExpandedEvent(id);
            setExpandedTab('pembayaran');
        }
    };
    const [editBayar, setEditBayar] = useState(null);
    const [editItem, setEditItem]   = useState(null);

    const formEditBayar = useForm({
        _method: 'PUT',
        nominal: '', tgl_bayar: '', keterangan: '', bukti_file: null,
    });

    const formEditItem = useForm({
        _method: 'PUT',
        tipe: 'Pengeluaran', nama_item: '', qty: 1, harga: '', keterangan: '',
    });

    const openEditBayar = (p) => {
        setEditBayar(p);
        formEditBayar.setData({
            _method: 'PUT',
            nominal:    p.nominal,
            tgl_bayar:  p.tgl_bayar,
            keterangan: p.keterangan || '',
            bukti_file: null,
        });
    };

    const openEditItem = (item) => {
        setEditItem(item);
        formEditItem.setData({
            _method: 'PUT',
            tipe:       item.tipe,
            nama_item:  item.nama_item,
            qty:        item.qty,
            harga:      item.harga,
            keterangan: item.keterangan || '',
        });
    };

    const handleEditBayar = (e) => {
        e.preventDefault();
        formEditBayar.post(route('manajemen.transaksi.update', editBayar.id_transaksi), {
            forceFormData: true,
            onSuccess: () => { formEditBayar.reset(); setEditBayar(null); },
        });
    };

    const handleEditItem = (e) => {
        e.preventDefault();
        formEditItem.post(route('manajemen.transaksi.item.update', editItem.id_item), {
            onSuccess: () => { formEditItem.reset(); setEditItem(null); },
        });
    };
    return (
        <ManajemenLayout>
            <Head title="Transaksi - Laksamana Muda" />

            {/* --- MODAL TAMBAH PEMBAYARAN --- */}
            {modalBayar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setModalBayar(null)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900">Tambah Pembayaran</h2>
                                <p className="text-sm text-gray-400">{modalBayar.nama_event}</p>
                            </div>
                            <button onClick={() => setModalBayar(null)}
                                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleBayar} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Nominal</label>
                                <RupiahInput placeholder="Masukkan nominal"
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formBayar.data.nominal} onChange={v => formBayar.setData('nominal', v)} />
                                {formBayar.errors.nominal && <p className="mt-1 text-xs text-red-500">{formBayar.errors.nominal}</p>}
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Tanggal Bayar</label>
                                <input type="date"
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formBayar.data.tgl_bayar} onChange={e => formBayar.setData('tgl_bayar', e.target.value)} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Keterangan</label>
                                <input type="text" placeholder="DP / Cicilan 1 / Pelunasan"
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formBayar.data.keterangan} onChange={e => formBayar.setData('keterangan', e.target.value)} />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Bukti Transfer (Opsional)</label>
                                <input type="file" accept="image/*"
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                    onChange={e => { if (e.target.files?.[0]) formBayar.setData('bukti_file', e.target.files[0]); }} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModalBayar(null)}
                                    className="flex-1 py-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={formBayar.processing}
                                    className="flex-1 py-3 bg-[#FF2D55] text-white rounded-xl text-sm font-bold hover:bg-red-600">
                                    {formBayar.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL TAMBAH ITEM PENGELUARAN/PEMASUKAN --- */}
            {modalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setModalItem(null)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900">Tambah Item</h2>
                                <p className="text-sm text-gray-400">{modalItem.nama_event}</p>
                            </div>
                            <button onClick={() => setModalItem(null)}
                                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleItem} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Tipe</label>
                                <select className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formItem.data.tipe} onChange={e => formItem.setData('tipe', e.target.value)}>
                                    <option value="Pengeluaran">Pengeluaran</option>
                                    <option value="Pemasukan">Pemasukan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Nama Item</label>
                                <input type="text" placeholder="Band, Catering, Sewa Venue..."
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formItem.data.nama_item} onChange={e => formItem.setData('nama_item', e.target.value)} />
                                {formItem.errors.nama_item && <p className="mt-1 text-xs text-red-500">{formItem.errors.nama_item}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-xs font-bold text-gray-600">Qty</label>
                                    <input type="number" min="1"
                                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                        value={formItem.data.qty} onChange={e => formItem.setData('qty', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-xs font-bold text-gray-600">Harga</label>
                                    <RupiahInput placeholder="0"
                                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                        value={formItem.data.harga} onChange={v => formItem.setData('harga', v)} />
                                </div>
                            </div>
                            {formItem.data.qty && formItem.data.harga && (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-400">Total</p>
                                    <p className="text-sm font-extrabold text-gray-800">
                                        {formatRupiah(formItem.data.qty * formItem.data.harga)}
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-600">Keterangan (Opsional)</label>
                                <input type="text" placeholder="Keterangan tambahan"
                                    className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                                    value={formItem.data.keterangan} onChange={e => formItem.setData('keterangan', e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModalItem(null)}
                                    className="flex-1 py-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={formItem.processing}
                                    className="flex-1 py-3 bg-[#FF2D55] text-white rounded-xl text-sm font-bold hover:bg-red-600">
                                    {formItem.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Transaksi</h1>
                <p className="mt-1 font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
            </div>

            {/* --- FILTER BAR --- */}
            <div className="p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Search */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Cari Event / Client</label>
                        <input type="text" placeholder="Nama event atau client..."
                            value={filterData.search}
                            onChange={e => applyFilter({ ...filterData, search: e.target.value })}
                            className="pl-3 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none min-w-[200px]" />
                    </div>

                    {/* Bulan */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Bulan</label>
                        <select value={filterData.bulan}
                            onChange={e => applyFilter({ ...filterData, bulan: e.target.value })}
                            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none min-w-[130px]">
                            <option value="">Semua Bulan</option>
                            {bulanList.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                    </div>

                    {/* Tahun */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Tahun</label>
                        <select value={filterData.tahun}
                            onChange={e => applyFilter({ ...filterData, tahun: e.target.value })}
                            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none min-w-[130px]">
                            <option value="">Semua Tahun</option>
                            {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Status</label>
                        <select value={filterData.status}
                            onChange={e => applyFilter({ ...filterData, status: e.target.value })}
                            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none min-w-[130px]">
                            <option value="">Semua Status</option>
                            <option value="Lunas">✅ Lunas</option>
                            <option value="Belum Lunas">⏳ Belum Lunas</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Urutkan</label>
                        <div className="flex gap-1">
                            {[
                                { key: 'tanggal', label: 'Tanggal' },
                                { key: 'deal',    label: 'Deal' },
                                { key: 'nominal', label: 'Terbayar' },
                            ].map(s => (
                                <button key={s.key} onClick={() => toggleSort(s.key)}
                                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                                        filterData.sort === s.key
                                            ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF2D55]/40'
                                    }`}>
                                    {s.label}
                                    {filterData.sort === s.key && (
                                        <span className="ml-1">{filterData.dir === 'desc' ? '↓' : '↑'}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reset */}
                    {(filterData.bulan || filterData.tahun || filterData.status || filterData.search || filterData.sort !== 'tanggal') && (
                        <button onClick={resetFilter}
                            className="px-4 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                            ✕ Reset
                        </button>
                    )}
                </div>

                {/* Active filter chips */}
                {(filterData.bulan || filterData.tahun || filterData.status || filterData.search) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400 font-medium">Filter aktif:</span>
                        {filterData.search && <span className="px-2.5 py-1 text-xs font-bold bg-pink-50 text-[#FF2D55] rounded-full">"{filterData.search}"</span>}
                        {filterData.bulan  && <span className="px-2.5 py-1 text-xs font-bold bg-pink-50 text-[#FF2D55] rounded-full">{bulanList.find(b => b.value === filterData.bulan)?.label}</span>}
                        {filterData.tahun  && <span className="px-2.5 py-1 text-xs font-bold bg-pink-50 text-[#FF2D55] rounded-full">{filterData.tahun}</span>}
                        {filterData.status && <span className="px-2.5 py-1 text-xs font-bold bg-pink-50 text-[#FF2D55] rounded-full">{filterData.status}</span>}
                    </div>
                )}
            </div>
            {/* --- MODAL EDIT PEMBAYARAN --- */}
{editBayar && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setEditBayar(null)}>
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-extrabold text-gray-900">Edit Pembayaran</h2>
                <button onClick={() => setEditBayar(null)}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-500" />
                </button>
            </div>
            <form onSubmit={handleEditBayar} className="space-y-4">
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Nominal</label>
                    <RupiahInput
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditBayar.data.nominal}
                        onChange={v => formEditBayar.setData('nominal', v)} />
                </div>
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Tanggal Bayar</label>
                    <input type="date"
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditBayar.data.tgl_bayar}
                        onChange={e => formEditBayar.setData('tgl_bayar', e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Keterangan</label>
                    <input type="text" placeholder="DP / Cicilan 1 / Pelunasan"
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditBayar.data.keterangan}
                        onChange={e => formEditBayar.setData('keterangan', e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Ganti Bukti (Opsional)</label>
                    <input type="file" accept="image/*"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                        onChange={e => { if (e.target.files?.[0]) formEditBayar.setData('bukti_file', e.target.files[0]); }} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditBayar(null)}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                        Batal
                    </button>
                    <button type="submit" disabled={formEditBayar.processing}
                        className="flex-1 py-3 bg-[#FF2D55] text-white rounded-xl text-sm font-bold hover:bg-red-600">
                        {formEditBayar.processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

{/* --- MODAL EDIT ITEM --- */}
{editItem && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setEditItem(null)}>
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-extrabold text-gray-900">Edit Item</h2>
                <button onClick={() => setEditItem(null)}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-500" />
                </button>
            </div>
            <form onSubmit={handleEditItem} className="space-y-4">
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Tipe</label>
                    <select className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditItem.data.tipe}
                        onChange={e => formEditItem.setData('tipe', e.target.value)}>
                        <option value="Pengeluaran">Pengeluaran</option>
                        <option value="Pemasukan">Pemasukan</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Nama Item</label>
                    <input type="text"
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditItem.data.nama_item}
                        onChange={e => formEditItem.setData('nama_item', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-600">Qty</label>
                        <input type="number" min="1"
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                            value={formEditItem.data.qty}
                            onChange={e => formEditItem.setData('qty', e.target.value)} />
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-600">Harga</label>
                        <RupiahInput
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                            value={formEditItem.data.harga}
                            onChange={v => formEditItem.setData('harga', v)} />
                    </div>
                </div>
                {formEditItem.data.qty && formEditItem.data.harga && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-sm font-extrabold text-gray-800">
                            {formatRupiah(formEditItem.data.qty * formEditItem.data.harga)}
                        </p>
                    </div>
                )}
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-600">Keterangan</label>
                    <input type="text"
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                        value={formEditItem.data.keterangan}
                        onChange={e => formEditItem.setData('keterangan', e.target.value)} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditItem(null)}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                        Batal
                    </button>
                    <button type="submit" disabled={formEditItem.processing}
                        className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">
                        {formEditItem.processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}
            {/* --- TABEL --- */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-12 px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Event</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Client</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Pax</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Deal</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Terbayar</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Sisa</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Laba Bersih</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {events.data?.length > 0 ? events.data.map((event, index) => (
                            <Fragment key={event.id_event}>
                                {/* ROW UTAMA */}
                                <tr className="transition-colors hover:bg-gray-50/60">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{(events.from - 1) + index + 1}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">{event.nama_event}</p>
                                        <p className="text-xs text-gray-400">{formatTanggal(event.tgl_event)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">{event.perusahaan || '-'}</p>
                                        <p className="text-xs text-gray-400">{event.client || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm font-semibold text-gray-800">{event.jumlah_pax ? `${event.jumlah_pax} pax` : '-'}</p>
                                        {event.harga_per_pax ? <p className="text-xs text-gray-400">@ {formatRupiah(event.harga_per_pax)}</p> : null}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">{formatRupiah(event.deal)}</td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const pct = event.deal > 0 ? Math.min(100, Math.round((event.total_dibayar / event.deal) * 100)) : 0;
                                            return (
                                                <div className="min-w-[120px]">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-semibold text-green-600">{formatRupiah(event.total_dibayar)}</span>
                                                        <span className="text-[10px] font-black text-gray-400">{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-2 rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${pct}%`,
                                                                background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#FF2D55' : '#f97316'
                                                            }} />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-red-500">{formatRupiah(event.sisa)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-extrabold ${event.laba_bersih >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatRupiah(event.laba_bersih)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 inline-block whitespace-nowrap text-[10px] font-black uppercase rounded-full ${
                                            event.status === 'Lunas' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-[#FF2D55]'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleExpand(event.id_event)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                            {expandedEvent === event.id_event ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </td>
                                </tr>

                                {/* ROW DROPDOWN */}
                                {expandedEvent === event.id_event && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-5 bg-gray-50/80">

                                            {/* Tab Toggle */}
                                            <div className="flex gap-2 p-1 mb-5 bg-gray-200 rounded-2xl w-fit">
                                                <button
                                                    onClick={() => setExpandedTab('pembayaran')}
                                                    className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all ${expandedTab === 'pembayaran' ? 'bg-white text-[#FF2D55] shadow-sm' : 'text-gray-500'}`}>
                                                    Pembayaran Client
                                                </button>
                                                <button
                                                    onClick={() => setExpandedTab('pengeluaran')}
                                                    className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all ${expandedTab === 'pengeluaran' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                                    Pengeluaran & Pemasukan
                                                </button>
                                            </div>

                                            {/* Tab: Pembayaran */}
                                            {expandedTab === 'pembayaran' && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Rincian Pembayaran</p>
                                                        <button onClick={() => { setModalBayar(event); formBayar.setData('id_event', event.id_event); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF2D55] text-white text-xs font-bold rounded-lg hover:bg-red-600">
                                                            <Plus size={12} /> Tambah Pembayaran
                                                        </button>
                                                    </div>
                                                    {event.pembayarans.length > 0 ? (
                                                        <table className="w-full mb-4">
                                                            <thead>
                                                                <tr className="text-left border-b border-gray-200">
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Tanggal</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Keterangan</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Nominal</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Bukti</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Aksi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {event.pembayarans.map((p) => (
                                                                    <tr key={p.id_transaksi}>
                                                                        <td className="py-2 text-sm text-gray-600">{formatTanggal(p.tgl_bayar)}</td>
                                                                        <td className="py-2 text-sm text-gray-600">{p.keterangan || '-'}</td>
                                                                        <td className="py-2 text-sm font-bold text-green-600">{formatRupiah(p.nominal)}</td>
                                                                        <td className="py-2">
                                                                            {p.bukti_file
                                                                                ? <a href={`/bukti-transaksi/${p.bukti_file}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">Lihat</a>
                                                                                : <span className="text-xs text-gray-300">-</span>}
                                                                        </td>
                                                                        <td className="py-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <button onClick={() => openEditBayar(p)}
                                                                                    className="p-1 text-blue-400 rounded-lg hover:text-blue-600 hover:bg-blue-50">
                                                                                    <Pencil size={13} />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteBayar(p.id_transaksi)}
                                                                                    className="p-1 text-red-400 rounded-lg hover:text-red-600 hover:bg-red-50">
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="mb-4 text-sm text-gray-400">Belum ada pembayaran.</p>
                                                    )}

                                                    {/* Summary Pembayaran */}
                                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                                                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                                            <p className="text-xs text-gray-400">Total Deal</p>
                                                            <p className="text-sm font-extrabold text-gray-800">{formatRupiah(event.deal)}</p>
                                                        </div>
                                                        <div className="p-3 bg-green-50 rounded-xl">
                                                            <p className="text-xs text-green-500">Total Terbayar</p>
                                                            <p className="text-sm font-extrabold text-green-600">{formatRupiah(event.total_dibayar)}</p>
                                                        </div>
                                                        <div className="p-3 bg-red-50 rounded-xl">
                                                            <p className="text-xs text-red-400">Sisa</p>
                                                            <p className="text-sm font-extrabold text-red-500">{formatRupiah(event.sisa)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tab: Pengeluaran & Pemasukan */}
                                            {expandedTab === 'pengeluaran' && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Rincian Pengeluaran & Pemasukan</p>
                                                        <button onClick={() => { setModalItem(event); formItem.setData('id_event', event.id_event); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                                                            <Plus size={12} /> Tambah Item
                                                        </button>
                                                    </div>
                                                    {event.pengeluarans.length > 0 ? (
                                                        <table className="w-full mb-4">
                                                            <thead>
                                                                <tr className="text-left border-b border-gray-200">
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Tipe</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Nama Item</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Qty</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Harga</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Total</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Keterangan</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Aksi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {event.pengeluarans.map((item) => (
                                                                    <tr key={item.id_item}>
                                                                        <td className="py-2">
                                                                            <span className={`px-2 py-0.5 inline-block whitespace-nowrap text-[10px] font-black uppercase rounded-full ${
                                                                                item.tipe === 'Pengeluaran' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                                                                            }`}>{item.tipe}</span>
                                                                        </td>
                                                                        <td className="py-2 text-sm font-semibold text-gray-800">{item.nama_item}</td>
                                                                        <td className="py-2 text-sm text-gray-600">{item.qty}</td>
                                                                        <td className="py-2 text-sm text-gray-600">{formatRupiah(item.harga)}</td>
                                                                        <td className="py-2 text-sm font-bold text-gray-800">{formatRupiah(item.total)}</td>
                                                                        <td className="py-2 text-sm text-gray-400">{item.keterangan || '-'}</td>
                                                                       <td className="py-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <button onClick={() => openEditItem(item)}
                                                                                    className="p-1 text-blue-400 rounded-lg hover:text-blue-600 hover:bg-blue-50">
                                                                                    <Pencil size={13} />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteItem(item.id_item)}
                                                                                    className="p-1 text-red-400 rounded-lg hover:text-red-600 hover:bg-red-50">
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="mb-4 text-sm text-gray-400">Belum ada item pengeluaran/pemasukan.</p>
                                                    )}

                                                    {/* Summary Laba */}
                                                    <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                                                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                                            <p className="text-xs text-gray-400">Total Deal</p>
                                                            <p className="text-sm font-extrabold text-gray-800">{formatRupiah(event.deal)}</p>
                                                        </div>
                                                        <div className="p-3 bg-green-50 rounded-xl">
                                                            <p className="text-xs text-green-500">Total Terbayar</p>
                                                            <p className="text-sm font-extrabold text-green-600">{formatRupiah(event.total_dibayar)}</p>
                                                        </div>
                                                        <div className="p-3 bg-red-50 rounded-xl">
                                                            <p className="text-xs text-red-400">Total Pengeluaran</p>
                                                            <p className="text-sm font-extrabold text-red-500">{formatRupiah(event.total_pengeluaran)}</p>
                                                        </div>
                                                        <div className={`p-3 rounded-xl ${event.laba_bersih >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                                            <p className={`text-xs ${event.laba_bersih >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>Laba Bersih</p>
                                                            <p className={`text-sm font-extrabold ${event.laba_bersih >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                                                                {formatRupiah(event.laba_bersih)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        )) : (
                            <tr>
                                <td colSpan={10} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada data event.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination meta={events} />

            {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">
                            {deleteModal.type === 'bayar' ? 'Hapus Pembayaran?' : 'Hapus Item?'}
                        </h2>
                        <p className="mb-5 text-xs text-center text-gray-400">Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                                {deleting ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}

