import FinanceLayout from '@/Layouts/FinanceLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Search, Download, X } from 'lucide-react';

export default function FinanceClientShow({ auth, client, events, pics, kategoris, filters }) {
    const [form, setForm] = useState({
        tgl_awal:  filters?.tgl_awal  || '',
        tgl_akhir: filters?.tgl_akhir || '',
        kategori:  filters?.kategori  || '',
        pic:       filters?.pic       || '',
        search:    filters?.search    || '',
    });
    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleFilter = (key, value) => {
        const updated = { ...form, [key]: value };
        setForm(updated);
        router.get(route('finance.client.show', client.id), updated, {
            preserveState: true, replace: true,
        });
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatRupiah = (angka) => {
        if (!angka) return '-';
        return Number(angka).toLocaleString('id-ID');
    };

    return (
        <FinanceLayout>
            <Head title={'Client - ' + client.nama_client} />

            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative h-44 overflow-hidden rounded-t-[2.5rem]">
                            <img
                                src={selectedEvent.poster_event
                                    ? '/' + selectedEvent.poster_event
                                    : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=700'}
                                className="object-cover w-full h-full"
                                alt={selectedEvent.nama_event}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 rounded-t-[2.5rem]" />
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute flex items-center justify-center w-10 h-10 transition-all rounded-full shadow-sm top-4 left-4 bg-white/90 backdrop-blur hover:bg-white"
                            >
                                <X size={18} className="text-gray-600" />
                            </button>
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF2D55]">
                                    ● {selectedEvent.status_event || 'Upcoming'}
                                </span>
                            </div>
                        </div>
                        <div className="p-8">
                            <h2 className="mb-1 text-2xl font-extrabold text-gray-900">{selectedEvent.nama_event}</h2>
                            {selectedEvent.kategori_event && (
                                <span className="inline-block mb-3 px-3 py-1 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                    {selectedEvent.kategori_event}
                                </span>
                            )}
                            <p className="mb-6 text-sm font-medium text-gray-400">
                                {formatTanggal(selectedEvent.tgl_mulai_event)} · {selectedEvent.jam_mulai} – {selectedEvent.jam_selesai}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Kategori', value: selectedEvent.kategori_event || '-' },
                                    { label: 'Client', value: client.nama_client },
                                    { label: 'PIC Event', value: selectedEvent.pic?.nama_pegawai || '-' },
                                    { label: 'Jumlah Pax', value: selectedEvent.jumlah_pax ? selectedEvent.jumlah_pax + ' orang' : '-' },
                                    { label: 'Area Event', value: selectedEvent.area_event || '-' },
                                    { label: 'Deal Harga', value: selectedEvent.deal_harga_event ? 'Rp ' + formatRupiah(selectedEvent.deal_harga_event) : '-' },
                                    { label: 'Technical Meeting', value: selectedEvent.technical_meeting || '-' },
                                    { label: 'Gladi Resik', value: selectedEvent.gladi_resik || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl">
                                        <p className="mb-1 text-xs font-bold text-gray-400">{item.label}</p>
                                        <p className="text-sm font-bold text-gray-800">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            {selectedEvent.note_event && (
                                <div className="p-4 mt-3 bg-yellow-50 rounded-2xl">
                                    <p className="mb-1 text-xs font-bold text-yellow-600">Catatan / Special Request</p>
                                    <p className="text-sm font-bold text-yellow-800">{selectedEvent.note_event}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Client</h1>
                <div className="flex items-center gap-2 mt-2">
                    <Link
                        href={route('finance.client.index')}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#FF2D55] rounded-full hover:bg-red-600 transition-colors"
                    >
                        <ChevronLeft size={12} />
                        Kembali
                    </Link>
                </div>
            </div>

            <div className="p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500">Tanggal Awal</label>
                        <input type="date" value={form.tgl_awal}
                            onChange={e => handleFilter('tgl_awal', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50" />
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500">Tanggal Akhir</label>
                        <input type="date" value={form.tgl_akhir}
                            onChange={e => handleFilter('tgl_akhir', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50" />
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500">Kategori Event</label>
                        <select value={form.kategori} onChange={e => handleFilter('kategori', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50">
                            <option value="">Semua</option>
                            {kategoris.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500">PIC Event</label>
                        <select value={form.pic} onChange={e => handleFilter('pic', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50">
                            <option value="">Semua</option>
                            {pics.map(p => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                        </select>
                    </div>
                </div>
                <div className="relative max-w-sm">
                    <input type="text" placeholder="Search" value={form.search}
                        onChange={e => handleFilter('search', e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
                    <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                </div>
            </div>

            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-[#FF2D55]">{client.nama_client}</h2>
                    <p className="text-xs text-gray-400">{client.perusahaan_client}</p>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-12 px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Event</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Tanggal</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Jam</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Pax</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Deal</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {events && events.length > 0 ? events.map((event, index) => (
                            <tr key={event.id_event} className="transition-colors hover:bg-gray-50/60">
                                <td className="px-6 py-4 text-sm font-medium text-gray-500">{index + 1}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{event.nama_event}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{formatTanggal(event.tgl_mulai_event)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{event.jam_mulai} - {event.jam_selesai}</td>
                                <td className="px-6 py-4 text-sm text-gray-800">{event.jumlah_pax ?? '-'}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{formatRupiah(event.deal_harga_event)}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => setSelectedEvent(event)}
                                        className="flex items-center justify-center w-8 h-8 border-2 border-[#FF2D55] rounded-lg hover:bg-pink-50 transition-colors"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF2D55" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada event untuk client ini.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </FinanceLayout>
    );
}

