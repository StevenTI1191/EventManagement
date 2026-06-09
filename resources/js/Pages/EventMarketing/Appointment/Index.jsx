import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import Pagination from '@/Components/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, Clock, Users, Wallet, Eye } from 'lucide-react';
import { useState } from 'react';

export default function AppointmentIndex({ appointments, counts, filters }) {
    const { flash } = usePage().props;
    const [filterStatus, setFilterStatus] = useState(filters?.status || 'Semua');

    const statusList = ['Semua', 'Pending', 'Dikonfirmasi', 'Reschedule', 'Selesai', 'Dibatalkan'];

    const handleFilter = (status) => {
        setFilterStatus(status);
        router.get(route('em.appointment.index'), { status: status === 'Semua' ? '' : status }, {
            preserveState: true, replace: true,
        });
    };

    const getStatusColor = (status) => {
        if (status === 'Dikonfirmasi') return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (status === 'Pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
        if (status === 'Reschedule') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (status === 'Selesai') return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        if (status === 'Dibatalkan') return 'bg-red-500/10 text-red-400 border-red-500/30';
        return '';
    };

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const formatBudget = (value) => {
        if (!value) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <EventMarketingLayout>
            <Head title="Appointments - Event Marketing" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Appointments</h1>
                <p className="mt-1 text-gray-500">Kelola permintaan meeting dari client.</p>
            </div>

            {flash?.success && (
                <div className="p-4 mb-6 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl">
                    ✅ {flash.success}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
                {[
                    { label: 'Pending', value: counts.pending, color: 'text-yellow-500' },
                    { label: 'Dikonfirmasi', value: counts.dikonfirmasi, color: 'text-green-500' },
                    { label: 'Selesai', value: counts.selesai, color: 'text-gray-500' },
                    { label: 'Dibatalkan', value: counts.dibatalkan, color: 'text-red-500' },
                ].map(stat => (
                    <div key={stat.label} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs font-medium text-gray-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                {statusList.map(s => (
                    <button key={s} onClick={() => handleFilter(s)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                            filterStatus === s
                                ? 'bg-[#FF2D55] text-white'
                                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {s}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-4">
                {appointments.data?.length > 0 ? appointments.data.map(apt => (
                    <div key={apt.id} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-extrabold text-gray-900">{apt.jenis_event}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(apt.status)}`}>
                                        {apt.status}
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-[#FF2D55] mb-3">
                                    {apt.client?.nama_client}
                                    {apt.client?.perusahaan_client && (
                                        <span className="font-normal text-gray-400"> — {apt.client.perusahaan_client}</span>
                                    )}
                                </p>

                                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {formatTanggal(apt.tgl_request)}
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
                            </div>

                            <Link
                                href={route('em.appointment.show', apt.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF2D55] text-white text-xs font-bold rounded-xl hover:bg-[#e02249] transition-colors flex-shrink-0"
                            >
                                <Eye size={14} />
                                Detail
                            </Link>
                        </div>
                    </div>
                )) : (
                    <div className="py-16 text-center text-gray-400 border-2 border-gray-200 border-dashed rounded-2xl">
                        <p className="font-bold">Tidak ada appointment.</p>
                    </div>
                )}
            </div>
            <Pagination meta={appointments} />
        </EventMarketingLayout>
    );
}
