import ManajemenLayout from '@/Layouts/ManajemenLayout';
import StatCard from '@/Components/StatCard';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft, Users, TrendingUp, CheckCircle,
    Calendar, CalendarCheck, Layout,
} from 'lucide-react';

export default function PegawaiShow({ pegawai, stats, clients, isEM }) {
    return (
        <ManajemenLayout>
            <Head title={`Statistik ${pegawai.nama_pegawai} - Laksamana Muda`} />

            <div className="p-6">
                {/* Header */}
                <Link
                    href={route('manajemen.pegawai.index')}
                    className="inline-flex items-center gap-2 mb-6 text-sm font-bold text-gray-500 hover:text-[#FF2D55] transition-colors"
                >
                    <ArrowLeft size={16} /> Kembali ke Manajemen Pegawai
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center justify-center flex-shrink-0 text-2xl font-black rounded-full w-16 h-16 bg-red-50 text-[#FF2D55]">
                        {pegawai.nama_pegawai.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{pegawai.nama_pegawai}</h1>
                        <span className="inline-block mt-1 px-3 py-1 bg-pink-50 text-[#FF2D55] text-[11px] font-black uppercase tracking-wider rounded-full">
                            {pegawai.posisi_pegawai}
                        </span>
                    </div>
                </div>

                {!isEM && (
                    <div className="flex items-start gap-3 p-4 mb-6 border border-yellow-200 bg-yellow-50 rounded-2xl">
                        <span className="text-lg leading-none">ℹ️</span>
                        <p className="text-sm font-medium text-yellow-700">
                            Statistik closing rate dirancang untuk posisi <b>Event Marketing</b> (penanganan appointment klien). Pegawai ini bukan EM, jadi angka appointment/closing kemungkinan kosong.
                        </p>
                    </div>
                )}

                {/* Closing rate highlight */}
                <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Closing Rate</h3>
                            <p className="text-xs text-gray-400">
                                Klien dari appointment yang akhirnya menjadi event di Laksamana Muda
                            </p>
                        </div>
                        <span className="text-4xl font-black text-[#FF2D55]">{stats.closing_rate}%</span>
                    </div>
                    <div className="w-full h-3 overflow-hidden bg-gray-100 rounded-full">
                        <div
                            className="h-3 rounded-full bg-[#FF2D55] transition-all"
                            style={{ width: `${stats.closing_rate}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        <b className="text-gray-800">{stats.klien_closing}</b> dari <b className="text-gray-800">{stats.klien_dihandle}</b> klien yang ditangani sudah memiliki event.
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-3">
                    <StatCard title="Klien Di-handle"     value={stats.klien_dihandle}      icon={<Users size={20} />}        color="#FF2D55" />
                    <StatCard title="Klien Closing"        value={stats.klien_closing}       icon={<CheckCircle size={20} />}  color="#FF2D55" />
                    <StatCard title="Closing Rate"         value={`${stats.closing_rate}%`}  icon={<TrendingUp size={20} />}   color="#FF2D55" />
                    <StatCard title="Appointment Ditangani" value={stats.total_appointment}  icon={<Calendar size={20} />}     color="#FF2D55" />
                    <StatCard title="Appointment Selesai"  value={stats.appointment_selesai} icon={<CalendarCheck size={20} />} color="#FF2D55" />
                    <StatCard title="Event sebagai PIC"    value={stats.total_event_pic}     icon={<Layout size={20} />}       color="#FF2D55" />
                </div>

                {/* Daftar klien yang ditangani */}
                <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-extrabold text-gray-800">Klien yang Ditangani ({clients.length})</h2>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="w-12 px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">No</th>
                                <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Nama Klien</th>
                                <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Perusahaan</th>
                                <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Jumlah Event</th>
                                <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {clients.length > 0 ? clients.map((c, i) => (
                                <tr key={c.id} className="transition-colors hover:bg-gray-50/60">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{i + 1}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">{c.nama_client}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{c.perusahaan_client || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{c.events_count}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                                            c.closed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {c.closed ? 'Closing' : 'Belum'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                        <p className="font-bold">Belum ada klien yang ditangani.</p>
                                        <p className="mt-1 text-sm">Klien muncul di sini setelah pegawai ini menangani appointment.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </ManajemenLayout>
    );
}
