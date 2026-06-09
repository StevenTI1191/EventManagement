import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

export default function EventDetail({ auth, event, tugas }) {
    const getStatusColor = (status) => {
        if (status === 'Done') return 'text-green-600 font-bold';
        if (status === 'Late') return 'text-red-500 font-bold';
        return 'text-blue-500 font-bold';
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    return (
        <ManajemenLayout>
            <Head title={'Evaluasi Event - ' + event.nama_event} />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Pegawai</h1>
                <div className="flex items-center gap-2 mt-2">
                    <Link
                        href={route('manajemen.evaluasi.index')}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#FF2D55] rounded-full hover:bg-[#e02249] transition-colors"
                    >
                        <ChevronLeft size={12} />
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Info Event & PIC */}
            <div className="flex flex-col items-center mb-8">
                <p className="mb-4 text-base font-extrabold text-gray-800">{event.nama_event}</p>
                <div className="flex items-center justify-center w-20 h-20 mb-3 text-2xl font-black rounded-full bg-red-50 text-[#FF2D55]">
                    {event.pic ? event.pic.nama_pegawai.substring(0, 2).toUpperCase() : 'N/A'}
                </div>
                <p className="text-xs text-gray-400">PIC: {event.pic ? event.pic.nama_pegawai : '-'}</p>
            </div>

            {/* Tabel To-Do List */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List To-Do-List Event</h2>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-12 px-6 py-3 text-xs font-bold text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">To Do List</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Start</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Deadline</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Done</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">PIC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {tugas.length > 0 ? tugas.map((t, i) => (
                            <tr key={t.id_tugas} className="transition-colors hover:bg-gray-50/60">
                                <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.nama_tugas}</td>
                                <td className={`px-6 py-4 text-sm ${getStatusColor(t.status_tugas)}`}>{t.status_tugas}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(t.created_at)}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(t.deadline_tugas)}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{t.status_tugas === 'Done' ? formatDate(t.updated_at) : '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{event.pic ? event.pic.nama_pegawai.split(' ')[0] : '-'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada to-do list untuk event ini.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ManajemenLayout>
    );
}

