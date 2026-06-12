import ManajemenLayout from '@/Layouts/ManajemenLayout';
import Pagination from '@/Components/Pagination';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Search, Calendar, Clock, Users, Wallet, UserCheck } from 'lucide-react';
import { useDebounced } from '@/hooks/useDebounced';

const statusColor = (status) => {
    if (status === 'Dikonfirmasi') return 'bg-green-50 text-green-600 border-green-200';
    if (status === 'Pending')      return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    if (status === 'Reschedule')   return 'bg-blue-50 text-blue-600 border-blue-200';
    if (status === 'Selesai')      return 'bg-gray-50 text-gray-500 border-gray-200';
    if (status === 'Dibatalkan')   return 'bg-red-50 text-red-500 border-red-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
};

const formatTgl = (tgl) => {
    if (!tgl) return '-';
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatBudget = (v) => {
    if (!v) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
};

export default function ManajemenAppointmentIndex({ auth, appointments, counts, filters }) {
    const [search, setSearch]           = useState(filters?.search || '');
    const [activeStatus, setActiveStatus] = useState(filters?.status || 'Semua');

    const handleFilter = (status) => {
        setActiveStatus(status);
        router.get(route('manajemen.appointment.index'),
            { status: status === 'Semua' ? '' : status, search },
            { preserveState: true, replace: true }
        );
    };

    const debouncedSearch = useDebounced((val) => {
        router.get(route('manajemen.appointment.index'),
            { status: activeStatus === 'Semua' ? '' : activeStatus, search: val },
            { preserveState: true, replace: true }
        );
    });

    const handleSearch = (val) => {
        setSearch(val);
        debouncedSearch(val);
    };

    const statusList = ['Semua', 'Pending', 'Dikonfirmasi', 'Reschedule', 'Selesai', 'Dibatalkan'];

    const statCards = [
        { label: 'Pending',      value: counts.pending,      color: 'text-yellow-500' },
        { label: 'Dikonfirmasi', value: counts.dikonfirmasi, color: 'text-green-500' },
        { label: 'Reschedule',   value: counts.reschedule,   color: 'text-blue-500' },
        { label: 'Selesai',      value: counts.selesai,      color: 'text-gray-400' },
        { label: 'Dibatalkan',   value: counts.dibatalkan,   color: 'text-red-400' },
    ];

    return (
        <ManajemenLayout>
            <Head title="Appointment - Manajemen" />

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Appointment</h1>
                <p className="mt-1 text-gray-500">Pantau semua permintaan meeting dari client beserta siapa yang menanganinya.</p>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-5">
                {statCards.map(s => (
                    <div key={s.label} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs font-medium text-gray-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* FILTER */}
            <div className="p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Status tabs */}
                    <div className="flex flex-wrap gap-2">
                        {statusList.map(s => (
                            <button key={s} onClick={() => handleFilter(s)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                    activeStatus === s
                                        ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF2D55]/40'
                                }`}>
                                {s}
                            </button>
                        ))}
                    </div>
                    {/* Search */}
                    <div className="relative max-w-xs">
                        <Search size={14} className="absolute text-gray-400 left-3 top-2.5" />
                        <input type="text" placeholder="Cari nama client..."
                            value={search} onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:outline-none" />
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
                {appointments.data?.length > 0 ? appointments.data.map(apt => (
                    <div key={apt.id} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Header row */}
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <h3 className="text-base font-extrabold text-gray-900">{apt.jenis_event}</h3>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${statusColor(apt.status)}`}>
                                        {apt.status}
                                    </span>
                                </div>

                                {/* Client */}
                                <p className="text-sm font-bold text-[#FF2D55] mb-3">
                                    {apt.client?.nama_client}
                                    {apt.client?.perusahaan_client && (
                                        <span className="font-normal text-gray-400"> — {apt.client.perusahaan_client}</span>
                                    )}
                                </p>

                                {/* Info grid */}
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        Request: {formatTgl(apt.tgl_request)}
                                        {apt.jam_request && ` · ${apt.jam_request}`}
                                    </span>
                                    {apt.jumlah_tamu && (
                                        <span className="flex items-center gap-1">
                                            <Users size={12} />
                                            {apt.jumlah_tamu} tamu
                                        </span>
                                    )}
                                    {apt.estimasi_budget && (
                                        <span className="flex items-center gap-1">
                                            <Wallet size={12} />
                                            {formatBudget(apt.estimasi_budget)}
                                        </span>
                                    )}
                                </div>

                                {/* Siapa yang membatalkan / konfirmasi */}
                                {apt.status === 'Dibatalkan' && apt.alasan_batal_client ? (
                                    // Dibatalkan oleh CLIENT (alasan dari client terisi)
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-500">
                                        <UserCheck size={13} />
                                        Dibatalkan oleh: <span className="font-black">Client</span>
                                    </div>
                                ) : apt.pegawai && (
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        apt.status === 'Dibatalkan'
                                            ? 'bg-red-50 text-red-500'
                                            : 'bg-green-50 text-green-700'
                                    }`}>
                                        <UserCheck size={13} />
                                        {apt.status === 'Dibatalkan' ? 'Dibatalkan' :
                                         apt.status === 'Reschedule' ? 'Di-reschedule' : 'Dikonfirmasi'} oleh:
                                        <span className="font-black">{apt.pegawai.nama_pegawai}</span>
                                        <span className="font-normal text-opacity-70">({apt.pegawai.posisi_pegawai})</span>
                                    </div>
                                )}

                                {/* Jadwal konfirmasi */}
                                {apt.tgl_konfirmasi && (
                                    <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={11} />
                                        Jadwal meeting: {formatTgl(apt.tgl_konfirmasi)}
                                        {apt.jam_konfirmasi && ` pukul ${apt.jam_konfirmasi} WIB`}
                                    </p>
                                )}

                                {/* Catatan EM */}
                                {apt.catatan_em && (
                                    <p className="mt-2 text-xs text-gray-400 italic">
                                        💬 {apt.catatan_em}
                                    </p>
                                )}

                                {/* Alasan batal dari client */}
                                {apt.status === 'Dibatalkan' && apt.alasan_batal_client && (
                                    <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Alasan dari Client:</p>
                                        <p className="text-xs text-red-600">{apt.alasan_batal_client}</p>
                                    </div>
                                )}
                            </div>

                            {/* Tanggal request di kanan */}
                            <div className="text-right flex-shrink-0">
                                <p className="text-[10px] text-gray-400">Tanggal Masuk</p>
                                <p className="text-xs font-bold text-gray-600">{formatTgl(apt.created_at)}</p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                        <p className="text-lg font-bold text-gray-400">Belum ada appointment.</p>
                    </div>
                )}
            </div>

            <Pagination meta={appointments} />
        </ManajemenLayout>
    );
}
