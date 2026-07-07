import FinanceLayout from '@/Layouts/FinanceLayout';
import Pagination from '@/Components/Pagination';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

export default function FinanceEventIndex({ auth, events, filters, clients, pegawais }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [filterData, setFilterData] = useState({
        tgl_awal:   filters.tgl_awal   || '',
        tgl_akhir:  filters.tgl_akhir  || '',
        kategori:   filters.kategori   || '',
        id_client:  filters.id_client  || '',
        id_pegawai: filters.id_pegawai || '',
    });
    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleFilterChange = (key, value) => {
        const updated = { ...filterData, [key]: value };
        setFilterData(updated);
        router.get(route('finance.event.index'), { ...updated, search: searchTerm }, {
            preserveState: true, replace: true,
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('finance.event.index'), { ...filterData, search: searchTerm }, {
            preserveState: true, replace: true,
        });
    };

    const formatRupiah = (angka) => {
        if (!angka) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <FinanceLayout>
            <Head title="Event - Finance" />

            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative h-52 overflow-hidden rounded-t-[2.5rem]">
                            <img
                                src={selectedEvent.poster_event
                                    ? `/${selectedEvent.poster_event}`
                                    : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=700'}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 rounded-t-[2.5rem]" />
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
                                    { label: 'Client', value: selectedEvent.client?.nama_client || '-' },
                                    { label: 'PIC Event', value: selectedEvent.pic?.nama_pegawai || '-' },
                                    { label: 'Jumlah Pax', value: selectedEvent.jumlah_pax ? `${selectedEvent.jumlah_pax} orang` : '-' },
                                    { label: 'Harga per Pax', value: formatRupiah(selectedEvent.harga_per_pax) },
                                    { label: 'Area Event', value: selectedEvent.area_event || '-' },
                                    { label: 'Deal Harga', value: formatRupiah(selectedEvent.deal_harga_event) },
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
                            {selectedEvent.deskripsi_event && (
                                <div className="p-4 mt-3 bg-gray-50 rounded-2xl">
                                    <p className="mb-1 text-xs font-bold text-gray-400">Deskripsi</p>
                                    <p className="text-sm text-gray-700">{selectedEvent.deskripsi_event}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Event</h1>
                <p className="mt-1 font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-10 border border-gray-100">
                <h2 className="mb-4 text-sm font-extrabold tracking-widest text-gray-400 uppercase">Filter</h2>
                <div className="grid items-end grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Tanggal Awal</label>
                        <input type="date" value={filterData.tgl_awal}
                            onChange={e => handleFilterChange('tgl_awal', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Tanggal Akhir</label>
                        <input type="date" value={filterData.tgl_akhir}
                            onChange={e => handleFilterChange('tgl_akhir', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Kategori</label>
                        <select value={filterData.kategori}
                            onChange={e => handleFilterChange('kategori', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua</option>
                            {['Konser','Wedding','Corporate','Birthday','Seminar','Lainnya'].map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Client</label>
                        <select value={filterData.id_client}
                            onChange={e => handleFilterChange('id_client', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.nama_client}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">PIC Event</label>
                        <select value={filterData.id_pegawai}
                            onChange={e => handleFilterChange('id_pegawai', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua</option>
                            {pegawais.map(p => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                        </select>
                    </div>
                    <form onSubmit={handleSearch} className="flex flex-col gap-1">
                        <label className="invisible text-xs font-bold text-gray-500">Search</label>
                        <div className="relative">
                            <Search className="absolute text-gray-400 left-3 top-3" size={18} />
                            <input type="text" placeholder="Search" value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50" />
                        </div>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {events.data && events.data.length > 0 ? events.data.map((event) => (
                    <div key={event.id_event} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="p-4">
                            <div className="relative">
                                <img
                                    src={event.poster_event
                                        ? `/${event.poster_event}`
                                        : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=400'}
                                    className="w-full h-56 object-cover rounded-[2rem]"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-sm">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${event.status_event === 'Upcoming' ? 'text-orange-500' : 'text-[#FF2D55]'}`}>
                                        ● {event.status_event || 'Upcoming'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            <h3 className="mb-1 text-xl font-bold text-gray-900 transition-colors group-hover:text-[#FF2D55] line-clamp-1">
                                {event.nama_event}
                            </h3>
                            {event.kategori_event && (
                                <span className="inline-block mb-3 px-3 py-1 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                    {event.kategori_event}
                                </span>
                            )}
                            <div className="flex items-center mb-1 text-sm font-medium text-gray-400">
                                <CalendarIcon size={14} className="mr-2 shrink-0" />
                                {event.tgl_mulai_event || '-'}
                            </div>
                            <div className="flex items-center mb-1 text-sm font-medium text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
                                </svg>
                                {event.client?.nama_client || 'Tanpa Client'}
                            </div>
                            <div className="flex items-center mb-5 text-sm font-medium text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                                </svg>
                                {event.pic?.nama_pegawai || '-'}
                            </div>
                            <button
                                onClick={() => setSelectedEvent(event)}
                                className="w-full py-3.5 bg-pink-50 text-[#FF2D55] font-bold rounded-2xl hover:bg-pink-100 transition-colors text-sm"
                            >
                                Lihat Detail
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <p className="font-bold text-gray-400">Belum ada data event.</p>
                    </div>
                )}
            </div>
            <Pagination meta={events} />
        </FinanceLayout>
    );
}

