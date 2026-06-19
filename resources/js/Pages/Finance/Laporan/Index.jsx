import FinanceLayout from '@/Layouts/FinanceLayout';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import {
    FileText, FileSpreadsheet, RefreshCw, TrendingUp,
    TrendingDown, Wallet, AlertCircle, ArrowDownLeft,
    Search, ChevronDown, ChevronUp, Printer, FileBarChart
} from 'lucide-react';

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TAHUN_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

export default function LaporanIndex() {
    const { auth } = usePage().props;

    const [tipe, setTipe]           = useState('bulan');
    const [bulan, setBulan]         = useState(new Date().getMonth() + 1);
    const [tahun, setTahun]         = useState(new Date().getFullYear());
    const [tglAwal, setTglAwal]     = useState('');
    const [tglAkhir, setTglAkhir]   = useState('');
    const [preview, setPreview]     = useState(null);
    const [loading, setLoading]     = useState(false);
    const [errorMsg, setErrorMsg]   = useState('');
    const [showTrx, setShowTrx]     = useState(false);
    const [showItem, setShowItem]   = useState(false);
    const [showRekap, setShowRekap] = useState(true);

    const buildParams = () => {
        const p = new URLSearchParams({ tipe, bulan, tahun });
        if (tipe === 'custom') { p.set('tgl_awal', tglAwal); p.set('tgl_akhir', tglAkhir); }
        return p.toString();
    };

    const handlePreview = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await axios.get(`/finance/laporan/preview?${buildParams()}`);
            setPreview(res.data);
            // Buka semua section saat preview
            setShowRekap(true); setShowTrx(true); setShowItem(true);
        } catch (e) {
            setErrorMsg(e?.response?.data?.message || 'Gagal memuat data laporan. Silakan coba lagi.');
        } finally { setLoading(false); }
    };

    const handlePrint = () => window.print();

    const handleExcel = () => {
        const a = document.createElement('a');
        a.href = `/finance/laporan/excel?${buildParams()}`;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const summaryCards = preview ? [
        { label: 'Total Pemasukan',   value: preview.summary.total_pemasukan,   color: 'text-green-600', bg: 'bg-green-50',   border: 'border-green-100',  icon: <ArrowDownLeft size={20}/> },
        { label: 'Total Pengeluaran', value: preview.summary.total_pengeluaran, color: 'text-red-500',   bg: 'bg-red-50',     border: 'border-red-100',    icon: <TrendingDown size={20}/> },
        { label: 'Laba Bersih',       value: preview.summary.laba_bersih,       color: preview.summary.laba_bersih_raw >= 0 ? 'text-blue-600' : 'text-orange-500', bg: preview.summary.laba_bersih_raw >= 0 ? 'bg-blue-50' : 'bg-orange-50', border: preview.summary.laba_bersih_raw >= 0 ? 'border-blue-100' : 'border-orange-100', icon: <TrendingUp size={20}/> },
        { label: 'Piutang',           value: preview.summary.total_piutang,     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: <AlertCircle size={20}/> },
        { label: 'Total Transaksi',   value: preview.summary.total_transaksi + ' transaksi', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: <Wallet size={20}/> },
    ] : [];

    return (
        <>
            {/* ── PRINT STYLES ────────────────────────────── */}
            <style>{`
                @media print {
                    /* Sembunyikan seluruh body, lalu tampilkan hanya #print-area */
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; top: 0; left: 0; width: 100%; }

                    #print-area {
                        font-family: Arial, sans-serif;
                        font-size: 10px;
                        color: #111;
                        padding: 0;
                        margin: 0;
                    }
                    .print-header {
                        background: #FF2D55 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color: white !important;
                        padding: 16px 20px;
                        margin-bottom: 16px;
                    }
                    .print-header h1 { font-size: 16px; font-weight: bold; margin: 0 0 2px; }
                    .print-header p  { font-size: 10px; margin: 0; opacity: 0.85; }

                    .print-periode { background: #fef9c3; border: 1px solid #fde047; padding: 6px 12px; border-radius: 4px; margin-bottom: 14px; font-size: 10px; color: #713f12; }

                    .print-cards { display: flex; gap: 8px; margin-bottom: 16px; }
                    .print-card  { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: #f9fafb; }
                    .print-card .pc-label { font-size: 8px; color: #6b7280; text-transform: uppercase; margin-bottom: 3px; }
                    .print-card .pc-value { font-size: 12px; font-weight: bold; }
                    .pc-green { color: #16a34a !important; } .pc-red { color: #dc2626 !important; }
                    .pc-blue  { color: #2563eb !important; } .pc-yellow { color: #ca8a04 !important; }
                    .pc-purple{ color: #7c3aed !important; }

                    .print-section { margin-bottom: 16px; page-break-inside: avoid; }
                    .print-section h2 { font-size: 11px; font-weight: bold; border-bottom: 2px solid #FF2D55; padding-bottom: 4px; margin-bottom: 8px; }

                    table { width: 100%; border-collapse: collapse; font-size: 9px; }
                    thead tr { background: #FF2D55 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    thead th { color: white !important; padding: 5px 8px; text-align: left; font-size: 8px; text-transform: uppercase; }
                    tbody tr:nth-child(even) { background: #f9fafb; }
                    tbody td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
                    .td-green { color: #16a34a; font-weight: bold; }
                    .td-red   { color: #dc2626; font-weight: bold; }
                    .td-blue  { color: #2563eb; font-weight: bold; }
                    .badge-lunas { background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 99px; }
                    .badge-belum { background: #fee2e2; color: #dc2626; padding: 1px 6px; border-radius: 99px; }
                    .badge-pen   { background: #fee2e2; color: #dc2626; padding: 1px 6px; border-radius: 99px; font-size: 7px; text-transform: uppercase; font-weight: bold; }
                    .badge-pem   { background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 99px; font-size: 7px; text-transform: uppercase; font-weight: bold; }

                    .print-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; text-align: center; }
                    @page { size: A4 landscape; margin: 12mm; }
                }
            `}</style>

            <FinanceLayout>
                <Head title="Laporan Keuangan - Finance" />

                {/* ── HEADER ── */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Laporan Keuangan</h1>
                    <p className="mt-1 font-medium text-gray-500">Generate dan export laporan keuangan per periode.</p>
                </div>

                {/* ── FILTER ── */}
                <div className="p-6 mb-8 bg-white border border-gray-100 shadow-sm rounded-2xl print:hidden">
                    <h2 className="mb-5 text-sm font-extrabold tracking-widest text-gray-400 uppercase">Filter Periode</h2>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {[{key:'bulan',label:'Per Bulan'},{key:'tahun',label:'Per Tahun'},{key:'custom',label:'Custom Range'}].map(t => (
                            <button key={t.key} onClick={() => setTipe(t.key)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${tipe === t.key ? 'bg-[#FF2D55] text-white border-[#FF2D55]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF2D55]/40'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-4 items-end">
                        {tipe === 'bulan' && (<>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-500">Bulan</label>
                                <select value={bulan} onChange={e => setBulan(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 min-w-[130px]">
                                    {BULAN.map((b,i) => <option key={i} value={i+1}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-500">Tahun</label>
                                <select value={tahun} onChange={e => setTahun(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 min-w-[130px]">
                                    {TAHUN_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </>)}
                        {tipe === 'tahun' && (
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-500">Tahun</label>
                                <select value={tahun} onChange={e => setTahun(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 min-w-[130px]">
                                    {TAHUN_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        {tipe === 'custom' && (<>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-500">Tanggal Awal</label>
                                <input type="date" value={tglAwal} onChange={e => setTglAwal(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 min-w-[130px]" />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-500">Tanggal Akhir</label>
                                <input type="date" value={tglAkhir} onChange={e => setTglAkhir(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 min-w-[130px]" />
                            </div>
                        </>)}
                        <button onClick={handlePreview} disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors">
                            {loading ? <RefreshCw size={16} className="animate-spin"/> : <Search size={16}/>}
                            {loading ? 'Memuat...' : 'Tampilkan'}
                        </button>
                    </div>
                </div>

                {/* ── ERROR ── */}
                {errorMsg && (
                    <div className="flex items-center gap-3 p-4 mb-6 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl print:hidden">
                        <AlertCircle size={18} className="shrink-0 text-red-500" />
                        <span>{errorMsg}</span>
                        <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600">
                            <span className="text-lg leading-none">&times;</span>
                        </button>
                    </div>
                )}

                {/* ── PREVIEW ── */}
                {preview && (
                    <>
                        {/* Toolbar export — disembunyikan saat print */}
                        <div className="flex items-center justify-between mb-6 print:hidden">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Periode</p>
                                <h2 className="text-xl font-extrabold text-gray-900">{preview.periode_label}</h2>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handlePrint}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                                    <Printer size={16}/> Cetak / PDF
                                </button>
                                <button onClick={handleExcel}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">
                                    <FileSpreadsheet size={16}/> Export Excel
                                </button>
                            </div>
                        </div>

                        {/* ── AREA YANG TERCETAK ── */}
                        <div id="print-area">
                            {/* Header print */}
                            <div className="print-header hidden print:block">
                                <h1>Laporan Keuangan — Laksamana Muda</h1>
                                <p>Periode: {preview.periode_label} &nbsp;|&nbsp; Dicetak oleh: {auth.user.nama_pegawai} &nbsp;|&nbsp; {new Date().toLocaleString('id-ID')}</p>
                            </div>

                            {/* Summary Cards */}
                            {/* Screen version */}
                            <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-5 print:hidden">
                                {summaryCards.map(card => (
                                    <div key={card.label} className={`p-5 bg-white border ${card.border} rounded-2xl shadow-sm`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`${card.bg} ${card.color} p-1.5 rounded-lg`}>{card.icon}</div>
                                            <p className="text-xs font-semibold text-gray-500 leading-tight">{card.label}</p>
                                        </div>
                                        <p className={`text-lg font-extrabold ${card.color}`}>{card.value}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Print version */}
                            <div className="print-cards hidden print:flex">
                                {[
                                    {label:'Total Pemasukan',   value: preview.summary.total_pemasukan,   cls:'pc-green'},
                                    {label:'Total Pengeluaran', value: preview.summary.total_pengeluaran, cls:'pc-red'},
                                    {label:'Laba Bersih',       value: preview.summary.laba_bersih,       cls: preview.summary.laba_bersih_raw >= 0 ? 'pc-blue' : 'pc-red'},
                                    {label:'Piutang',           value: preview.summary.total_piutang,     cls:'pc-yellow'},
                                    {label:'Total Transaksi',   value: preview.summary.total_transaksi+' transaksi', cls:'pc-purple'},
                                ].map(c => (
                                    <div key={c.label} className="print-card">
                                        <div className="pc-label">{c.label}</div>
                                        <div className={`pc-value ${c.cls}`}>{c.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Rekap Event */}
                            <div className={`mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden print:shadow-none print:border-0 print:rounded-none print-section`}>
                                <button onClick={() => setShowRekap(!showRekap)}
                                    className="flex items-center justify-between w-full px-6 py-4 border-b border-gray-100 hover:bg-gray-50 print:hidden">
                                    <h3 className="text-sm font-extrabold text-gray-900">Rekap Per Event ({preview.rekap_event.length})</h3>
                                    {showRekap ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </button>
                                <h2 className="hidden print:block">Rekap Per Event</h2>
                                {(showRekap) && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[#FF2D55]">
                                                    {['No','Event','Client','Deal','Terbayar','Pengeluaran','Laba','Status'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-xs font-bold text-left text-white uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {preview.rekap_event.length > 0 ? preview.rekap_event.map((ev, i) => (
                                                    <tr key={ev.id_event ?? (ev.nama_event + '-' + i)} className="hover:bg-gray-50/60">
                                                        <td className="px-4 py-3 text-sm text-gray-400">{i+1}</td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 max-w-[180px] truncate">{ev.nama_event}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{ev.client}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">{ev.deal}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-green-600 td-green">{ev.terbayar}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-red-500 td-red">{ev.pengeluaran}</td>
                                                        <td className={`px-4 py-3 text-sm font-extrabold ${ev.laba_raw >= 0 ? 'text-blue-600 td-blue' : 'text-orange-500 td-red'}`}>{ev.laba}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${ev.status === 'Lunas' ? 'bg-green-50 text-green-600 badge-lunas' : 'bg-red-50 text-[#FF2D55] badge-belum'}`}>
                                                                {ev.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada event pada periode ini.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Pembayaran */}
                            <div className="mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden print:shadow-none print:border-0 print:rounded-none print-section">
                                <button onClick={() => setShowTrx(!showTrx)}
                                    className="flex items-center justify-between w-full px-6 py-4 border-b border-gray-100 hover:bg-gray-50 print:hidden">
                                    <h3 className="text-sm font-extrabold text-gray-900">Rincian Pembayaran Client ({preview.transaksis.length})</h3>
                                    {showTrx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </button>
                                <h2 className="hidden print:block">Rincian Pembayaran Client</h2>
                                {showTrx && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[#FF2D55]">
                                                    {['No','Tanggal','Event','Client','Keterangan','Nominal'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-xs font-bold text-left text-white uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {preview.transaksis.length > 0 ? preview.transaksis.map((t, i) => (
                                                    <tr key={t.id_transaksi ?? (t.tgl_bayar + '-' + t.nominal + '-' + i)} className="hover:bg-gray-50/60">
                                                        <td className="px-4 py-3 text-sm text-gray-400">{i+1}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{t.tgl_bayar}</td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 max-w-[160px] truncate">{t.nama_event}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{t.client}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">{t.keterangan || '-'}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-green-600 td-green">{t.nominal}</td>
                                                    </tr>
                                                )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada pembayaran pada periode ini.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Item */}
                            <div className="mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden print:shadow-none print:border-0 print:rounded-none print-section">
                                <button onClick={() => setShowItem(!showItem)}
                                    className="flex items-center justify-between w-full px-6 py-4 border-b border-gray-100 hover:bg-gray-50 print:hidden">
                                    <h3 className="text-sm font-extrabold text-gray-900">Rincian Item Pengeluaran & Pemasukan ({preview.items.length})</h3>
                                    {showItem ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </button>
                                <h2 className="hidden print:block">Rincian Item Pengeluaran & Pemasukan</h2>
                                {showItem && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[#FF2D55]">
                                                    {['No','Event','Tipe','Nama Item','Qty','Harga','Total'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-xs font-bold text-left text-white uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {preview.items.length > 0 ? preview.items.map((item, i) => (
                                                    <tr key={item.id_item ?? (item.nama_item + '-' + i)} className="hover:bg-gray-50/60">
                                                        <td className="px-4 py-3 text-sm text-gray-400">{i+1}</td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 max-w-[160px] truncate">{item.nama_event}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${item.tipe==='Pengeluaran' ? 'bg-red-50 text-red-500 badge-pen' : 'bg-green-50 text-green-600 badge-pem'}`}>
                                                                {item.tipe}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-800">{item.nama_item}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{item.qty}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{item.harga}</td>
                                                        <td className={`px-4 py-3 text-sm font-bold ${item.tipe==='Pengeluaran' ? 'text-red-500 td-red' : 'text-green-600 td-green'}`}>{item.total}</td>
                                                    </tr>
                                                )) : <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada item pada periode ini.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Footer print */}
                            <div className="print-footer hidden print:block">
                                Laporan Keuangan Laksamana Muda &nbsp;|&nbsp; Digenerate otomatis oleh sistem &nbsp;|&nbsp; {new Date().toLocaleString('id-ID')}
                            </div>
                        </div>
                    </>
                )}

                {!preview && !loading && (
                    <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50 print:hidden">
                        <FileBarChart size={48} className="mx-auto mb-4 text-gray-300"/>
                        <p className="font-bold text-gray-400">Pilih periode dan klik "Tampilkan"</p>
                        <p className="mt-1 text-sm text-gray-300">untuk melihat preview laporan keuangan</p>
                    </div>
                )}
            </FinanceLayout>
        </>
    );
}
