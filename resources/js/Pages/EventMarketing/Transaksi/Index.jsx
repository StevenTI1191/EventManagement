import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function TransaksiIndex({ auth, events }) {
    const [expandedEvent, setExpandedEvent] = useState(null);
    const [expandedTab, setExpandedTab] = useState('pembayaran');

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

    const toggleExpand = (id) => {
        if (expandedEvent === id) {
            setExpandedEvent(null);
        } else {
            setExpandedEvent(id);
            setExpandedTab('pembayaran');
        }
    };

    return (
        <EventMarketingLayout>
            <Head title="Transaksi - Event Marketing" />

            <div className="mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Transaksi</h1>
                <p className="mt-1 font-medium text-gray-500">
                    Selamat Datang, <span className="text-[#FF2D55] font-bold">{auth.user.nama_pegawai}</span>!
                </p>
            </div>

            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-12 px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Event</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Client</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Deal</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Terbayar</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Sisa</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Laba Bersih</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {events && events.length > 0 ? events.map((event, index) => (
                            <>
                                <tr key={event.id_event} className="transition-colors hover:bg-gray-50/60">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">{event.nama_event}</p>
                                        <p className="text-xs text-gray-400">{formatTanggal(event.tgl_event)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">{event.perusahaan || '-'}</p>
                                        <p className="text-xs text-gray-400">{event.client || '-'}</p>
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
                                        <span className={'text-sm font-extrabold ' + (event.laba_bersih >= 0 ? 'text-green-600' : 'text-red-500')}>
                                            {formatRupiah(event.laba_bersih)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={'px-3 py-1 inline-block whitespace-nowrap text-[10px] font-black uppercase rounded-full ' + (
                                            event.status === 'Lunas' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-[#FF2D55]'
                                        )}>
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

                                {expandedEvent === event.id_event && (
                                    <tr key={'detail-' + event.id_event}>
                                        <td colSpan={9} className="px-6 py-5 bg-gray-50/80">

                                            {/* Tab Toggle */}
                                            <div className="flex gap-2 p-1 mb-5 bg-gray-200 rounded-2xl w-fit">
                                                <button
                                                    onClick={() => setExpandedTab('pembayaran')}
                                                    className={'px-5 py-1.5 rounded-xl text-xs font-bold transition-all ' + (expandedTab === 'pembayaran' ? 'bg-white text-[#FF2D55] shadow-sm' : 'text-gray-500')}>
                                                    Pembayaran Client
                                                </button>
                                                <button
                                                    onClick={() => setExpandedTab('pengeluaran')}
                                                    className={'px-5 py-1.5 rounded-xl text-xs font-bold transition-all ' + (expandedTab === 'pengeluaran' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>
                                                    Pengeluaran & Pemasukan
                                                </button>
                                            </div>

                                            {/* Tab: Pembayaran */}
                                            {expandedTab === 'pembayaran' && (
                                                <div>
                                                    <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">Rincian Pembayaran</p>
                                                    {event.pembayarans.length > 0 ? (
                                                        <table className="w-full mb-4">
                                                            <thead>
                                                                <tr className="text-left border-b border-gray-200">
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Tanggal</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Keterangan</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Nominal</th>
                                                                    <th className="pb-2 text-xs font-bold text-gray-400">Bukti</th>
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
                                                                                ? <a href={`/bukti-transaksi/${p.bukti_file}`} target="_blank" rel="noreferrer"
                                                                                    className="text-xs text-blue-500 underline hover:text-blue-700">Lihat</a>
                                                                                : <span className="text-xs text-gray-300">-</span>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="mb-4 text-sm text-gray-400">Belum ada pembayaran.</p>
                                                    )}

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
                                                    <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">Rincian Pengeluaran & Pemasukan</p>
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
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {event.pengeluarans.map((item) => (
                                                                    <tr key={item.id_item}>
                                                                        <td className="py-2">
                                                                            <span className={'px-2 py-0.5 inline-block whitespace-nowrap text-[10px] font-black uppercase rounded-full ' + (
                                                                                item.tipe === 'Pengeluaran' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                                                                            )}>{item.tipe}</span>
                                                                        </td>
                                                                        <td className="py-2 text-sm font-semibold text-gray-800">{item.nama_item}</td>
                                                                        <td className="py-2 text-sm text-gray-600">{item.qty}</td>
                                                                        <td className="py-2 text-sm text-gray-600">{formatRupiah(item.harga)}</td>
                                                                        <td className="py-2 text-sm font-bold text-gray-800">{formatRupiah(item.total)}</td>
                                                                        <td className="py-2 text-sm text-gray-400">{item.keterangan || '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="mb-4 text-sm text-gray-400">Belum ada item pengeluaran/pemasukan.</p>
                                                    )}

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
                                                        <div className={'p-3 rounded-xl ' + (event.laba_bersih >= 0 ? 'bg-blue-50' : 'bg-orange-50')}>
                                                            <p className={'text-xs ' + (event.laba_bersih >= 0 ? 'text-blue-400' : 'text-orange-400')}>Laba Bersih</p>
                                                            <p className={'text-sm font-extrabold ' + (event.laba_bersih >= 0 ? 'text-blue-600' : 'text-orange-500')}>
                                                                {formatRupiah(event.laba_bersih)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </>
                        )) : (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada data transaksi.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </EventMarketingLayout>
    );
}
