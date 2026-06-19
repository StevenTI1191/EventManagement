import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import Pagination from '@/Components/Pagination';
import { Search, Plus, Calendar as CalendarIcon, X, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';

export default function Index({ auth, events, filters, clients, pegawais }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [filterData, setFilterData] = useState({
        tgl_awal:   filters.tgl_awal   || '',
        tgl_akhir:  filters.tgl_akhir  || '',
        kategori:   filters.kategori   || '',
        id_client:  filters.id_client  || '',
        id_pegawai: filters.id_pegawai || '',
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [deleteEvent, setDeleteEvent]     = useState(null);
    const [deleting, setDeleting]           = useState(false);
    const [modalTab, setModalTab] = useState('detail');
    const [modalTugas, setModalTugas] = useState([]);

    const handleFilterChange = (key, value) => {
        const updated = { ...filterData, [key]: value };
        setFilterData(updated);
        router.get(route('em.event.index'), { ...updated, search: searchTerm }, {
            preserveState: true, replace: true,
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('em.event.index'), { ...filterData, search: searchTerm }, {
            preserveState: true, replace: true,
        });
    };

    const handleOpenModal = (event, tab = 'detail') => {
        setSelectedEvent(event);
        setModalTab(tab);
        setModalTugas(event.tugas || []);
    };

    const handleTabSwitch = (tab) => {
        setModalTab(tab);
        if (tab === 'todo' && selectedEvent) {
            setModalTugas(selectedEvent.tugas || []);
        }
    };

    // Auto-buka modal detail jika datang dari ?open={id_event} (mis. dari Recent Events dashboard)
    useEffect(() => {
        const openId = new URLSearchParams(window.location.search).get('open');
        if (openId) {
            const ev = (events.data || []).find(e => String(e.id_event) === String(openId));
            if (ev) handleOpenModal(ev);
        }
    }, []);

    const formatRupiah = (angka) => {
        if (!angka) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleDelete = (event) => setDeleteEvent(event);
    const confirmDeleteEvent = () => {
        if (deleting) return;
        setDeleting(true);
        router.delete(route('em.event.destroy', deleteEvent.id_event), {
            preserveScroll: true,
            onFinish: () => { setDeleteEvent(null); setDeleting(false); },
        });
    };

    return (
        <EventMarketingLayout>
            <Head title="Event - Laksamana Muda" />

            {/* MODAL DETAIL */}
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
                                    ● {selectedEvent.status_event || 'Upcoming'}
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

                            {/* Tab Toggle */}
                            <div className="flex gap-2 p-1 mb-6 bg-gray-100 rounded-2xl w-fit">
                                <button
                                    onClick={() => handleTabSwitch('detail')}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${modalTab === 'detail' ? 'bg-white text-[#FF2D55] shadow-sm' : 'text-gray-500'}`}
                                >
                                    Detail
                                </button>
                                <button
                                    onClick={() => handleTabSwitch('todo')}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${modalTab === 'todo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    To-Do List
                                </button>
                            </div>

                            {/* Tab: Detail */}
                            {modalTab === 'detail' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Kategori', value: selectedEvent.kategori_event || '-' },
                                            { label: 'Client', value: selectedEvent.client?.nama_client || '-' },
                                            { label: 'PIC Event', value: selectedEvent.pic?.nama_pegawai || '-' },
                                            { label: 'Jumlah Pax', value: selectedEvent.jumlah_pax ? `${selectedEvent.jumlah_pax} orang` : '-' },
                                            { label: 'Area Event', value: selectedEvent.area_event || '-' },
                                            { label: 'Deal Harga', value: formatRupiah(selectedEvent.deal_harga_event) },
                                            { label: 'Jam Keluar Makanan', value: selectedEvent.jam_keluar_makanan || '-' },
                                            { label: 'Technical Meeting', value: selectedEvent.technical_meeting || '-' },
                                            { label: 'Gladi Resik', value: selectedEvent.gladi_resik || '-' },
                                        ].map((item, i) => (
                                            <div key={i} className="p-4 bg-gray-50 rounded-2xl">
                                                <p className="mb-1 text-xs font-bold text-gray-400">{item.label}</p>
                                                <p className="text-sm font-bold text-gray-800">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedEvent.entairtainment_event && (
                                        <div className="p-4 bg-gray-50 rounded-2xl">
                                            <p className="mb-1 text-xs font-bold text-gray-400">Entertainment</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedEvent.entairtainment_event}</p>
                                        </div>
                                    )}
                                    {selectedEvent.food_beverage_event && (
                                        <div className="p-4 bg-gray-50 rounded-2xl">
                                            <p className="mb-1 text-xs font-bold text-gray-400">Food & Beverage</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedEvent.food_beverage_event}</p>
                                        </div>
                                    )}
                                    {selectedEvent.note_event && (
                                        <div className="p-4 bg-yellow-50 rounded-2xl">
                                            <p className="mb-1 text-xs font-bold text-yellow-600">Catatan / Special Request</p>
                                            <p className="text-sm font-bold text-yellow-800">{selectedEvent.note_event}</p>
                                        </div>
                                    )}
                                    {selectedEvent.deskripsi_event && (
                                        <div className="p-4 bg-gray-50 rounded-2xl">
                                            <p className="mb-1 text-xs font-bold text-gray-400">Deskripsi</p>
                                            <p className="text-sm text-gray-700">{selectedEvent.deskripsi_event}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: To-Do List */}
                            {modalTab === 'todo' && (
                                <div>
                                    {modalTugas.length === 0 ? (
                                        <div className="py-10 text-center text-gray-400">
                                            <p className="font-bold">Belum ada tugas untuk event ini.</p>
                                            <p className="mt-1 text-sm">Tambahkan tugas di halaman To-Do List.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {modalTugas.map(t => (
                                                <div key={t.id_tugas} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                                                        ${t.status_tugas === 'Done' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                                        {t.status_tugas === 'Done' && (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                                                <polyline points="20 6 9 17 4 12"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-semibold ${t.status_tugas === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {t.nama_tugas}
                                                        </p>
                                                        {t.catatan_tugas && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{t.catatan_tugas}</p>
                                                        )}
                                                        {t.deskripsi_tugas && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{t.deskripsi_tugas}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full
                                                            ${t.status_tugas === 'Done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {t.status_tugas}
                                                        </span>
                                                        {t.deadline_tugas && (
                                                            <p className="text-[10px] text-gray-400 mt-1">
                                                                {new Date(t.deadline_tugas).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-6 text-center">
                                        <Link
                                            href={route('em.todo.index', selectedEvent.id_event)}
                                            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-blue-600 transition-colors bg-blue-50 rounded-2xl hover:bg-blue-100"
                                        >
                                            Kelola semua tugas →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Event</h1>
                    <p className="mt-1 font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
                </div>
            </div>

            {/* FILTER */}
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
                        <label className="text-xs font-bold text-gray-500">Kategori Event</label>
                        <select value={filterData.kategori}
                            onChange={e => handleFilterChange('kategori', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua Kategori</option>
                            <option value="Konser">Konser</option>
                            <option value="Wedding">Wedding</option>
                            <option value="Corporate">Corporate</option>
                            <option value="Birthday">Birthday</option>
                            <option value="Seminar">Seminar</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">Client</label>
                        <select value={filterData.id_client}
                            onChange={e => handleFilterChange('id_client', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.nama_client}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">PIC Event</label>
                        <select value={filterData.id_pegawai}
                            onChange={e => handleFilterChange('id_pegawai', e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50">
                            <option value="">Semua PIC</option>
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

            {/* GRID CARDS */}
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
                                        ● {event.status_event || 'Upcoming'}
                                    </span>
                                </div>
                                <div className="absolute flex gap-2 transition-all duration-200 opacity-0 top-4 left-4 group-hover:opacity-100">
                                    <Link
                                        href={route('em.event.edit', event.id_event)}
                                        className="flex items-center justify-center text-gray-500 transition-colors rounded-full shadow-sm w-9 h-9 bg-white/90 backdrop-blur hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <Pencil size={14} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(event)}
                                        className="flex items-center justify-center text-gray-500 transition-colors rounded-full shadow-sm w-9 h-9 bg-white/90 backdrop-blur hover:bg-red-50 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
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

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleOpenModal(event, 'detail')}
                                    className="flex-1 py-3.5 bg-pink-50 text-[#FF2D55] font-bold rounded-2xl hover:bg-pink-100 transition-colors text-sm"
                                >
                                    Detail
                                </button>
                                <Link
                                    href={route('em.todo.index', event.id_event)}
                                    className="flex-1 py-3.5 bg-blue-50 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-colors text-sm text-center"
                                >
                                    To-Do List
                                </Link>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <p className="font-bold text-gray-400">Belum ada data event.</p>
                    </div>
                )}
            </div>
            <Pagination meta={events} />

            {/* FLOATING ACTION BUTTON */}
            <Link
                href={route('em.event.create')}
                className="fixed bottom-10 right-10 bg-[#FF2D55] text-white px-8 py-4 rounded-full shadow-2xl shadow-[#FF2D55]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 z-50"
            >
                <Plus size={24} strokeWidth={3} />
                <span className="text-lg font-bold">Tambah Event</span>
            </Link>

            {deleteEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Event?</h2>
                        <p className="mb-1 text-sm font-bold text-center text-gray-700">"{deleteEvent.nama_event}"</p>
                        <p className="mb-5 text-xs text-center text-gray-400">Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteEvent(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={confirmDeleteEvent} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                                {deleting ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EventMarketingLayout>
    );
}
