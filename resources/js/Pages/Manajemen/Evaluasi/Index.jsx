import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function EvaluasiIndex({ auth, pegawais, events, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || '');

    const handleFilter = (key, value) => {
        const updated = { search, status, [key]: value };
        if (key === 'search') setSearch(value);
        if (key === 'status') setStatus(value);
        router.get(route('manajemen.evaluasi.index'), updated, {
            preserveState: true, replace: true,
        });
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        if (status === 'Done') return 'bg-green-100 text-green-700';
        if (status === 'Ongoing') return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <ManajemenLayout>
            <Head title="Evaluasi Kinerja - Laksamana Muda" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Evaluasi Kinerja</h1>
            </div>

            {/* Section Pegawai */}
            <div className="mb-8">
                <p className="mb-4 text-sm font-bold tracking-widest text-gray-500 uppercase">Pegawai</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pegawais.map(pegawai => (
                        <div key={pegawai.id_pegawai} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                            <div className="flex flex-col items-center mb-4">
                                <div className="flex items-center justify-center w-16 h-16 mb-3 text-xl font-black rounded-full bg-red-50 text-[#FF2D55]">
                                    {pegawai.nama_pegawai.substring(0, 2).toUpperCase()}
                                </div>
                                <p className="text-sm font-bold text-center text-gray-800">{pegawai.nama_pegawai}</p>
                                <p className="text-xs text-gray-400">{pegawai.posisi_pegawai}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                                <div className="p-2 rounded-xl bg-gray-50">
                                    <p className="text-lg font-black text-gray-800">{pegawai.events_count ?? 0}</p>
                                    <p className="text-[10px] text-gray-400">Total Event</p>
                                </div>
                                <div className="p-2 rounded-xl bg-gray-50">
                                    <p className="text-lg font-black text-gray-800">{pegawai.rekomendasi_rehire}</p>
                                    <p className="text-[10px] text-gray-400">Rehire</p>
                                </div>
                            </div>
                            <Link
                                href={route('manajemen.evaluasi.pegawai', pegawai.id_pegawai)}
                                className="block w-full py-1.5 text-xs font-bold text-center text-white bg-[#FF2D55] rounded-lg hover:bg-[#e02249] transition-colors"
                            >
                                View
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section Project Event */}
            <div>
                <p className="mb-4 text-sm font-bold tracking-widest text-gray-500 uppercase">Project Event</p>

                {/* Filter */}
                <div className="flex items-center gap-3 mb-4">
                    <div>
                        <p className="mb-1 text-xs text-gray-400">Filter Status Event</p>
                        <select
                            value={status}
                            onChange={e => handleFilter('status', e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-[#FF2D55] focus:border-[#FF2D55]"
                        >
                            <option value="">Semua</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                    <div className="flex-1 max-w-sm mt-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                value={search}
                                onChange={e => handleFilter('search', e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55] bg-gray-50"
                            />
                            <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Grid Event */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {events.data && events.data.length > 0 ? events.data.map(event => (
                        <Link
                            key={event.id_event}
                            href={route('manajemen.evaluasi.event', event.id_event)}
                            className="block overflow-hidden transition-shadow bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md"
                        >
                            <PosterImage poster={event.poster_event} nama={event.nama_event} />
                            <div className="p-4">
                                <p className="mb-1 text-sm font-bold text-gray-800 truncate">{event.nama_event}</p>
                                <p className="mb-2 text-xs text-gray-400">{formatTanggal(event.tgl_mulai_event)}</p>
                                <div className="flex items-center justify-between">
                                    <span className={'px-2 py-0.5 text-xs font-bold rounded-full ' + getStatusColor(event.status_event)}>
                                        {event.status_event}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {event.tugas_done_count ?? 0}/{event.tugas_count ?? 0} tugas
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <div className="col-span-3 py-16 text-center text-gray-400">
                            <p className="font-bold">Belum ada event.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {events.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {events.links.map((link, i) => (
                            <button
                                key={link.label + '-' + i}
                                onClick={() => link.url && router.get(link.url)}
                                disabled={!link.url}
                                className={'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 ' + (
                                    link.active
                                        ? 'bg-[#FF2D55] text-white'
                                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                                )}
                            >
                                {/* Decode HTML entities («/») dari Laravel paginator tanpa dangerouslySetInnerHTML */}
                                {link.label
                                    .replace('&laquo; ', '« ')
                                    .replace(' &raquo;', ' »')}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </ManajemenLayout>
    );
}

function PosterImage({ poster, nama }) {
    const [error, setError] = useState(false);

    if (poster && !error) {
        return (
            <img
                src={'/' + poster}
                alt={nama}
                className="object-cover w-full h-36"
                onError={() => setError(true)}
            />
        );
    }

    return (
        <div className="flex items-center justify-center w-full h-36 bg-gradient-to-br from-red-50 to-orange-50">
            <span className="text-2xl font-black text-[#FF2D55]/30">
                {nama.substring(0, 2).toUpperCase()}
            </span>
        </div>
    );
}

