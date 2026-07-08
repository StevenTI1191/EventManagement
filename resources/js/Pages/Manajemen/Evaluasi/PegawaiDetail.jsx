import ManajemenLayout from '@/Layouts/ManajemenLayout';
import StatCard from '@/Components/StatCard';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Save, StickyNote, Users, TrendingUp, CheckCircle, Calendar, CalendarCheck, Layout } from 'lucide-react';

export default function PegawaiDetail({ auth, pegawai, events, stats, clients = [], isEM }) {
    const { flash } = usePage().props;
    const [expanded, setExpanded] = useState({});
    const [rehire, setRehire] = useState(pegawai.rekomendasi_rehire);

    const noteForm = useForm({ note_pegawai: pegawai.note_pegawai || '' });

    const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        if (status === 'Done') return 'text-green-600 font-bold';
        if (status === 'Late') return 'text-red-500 font-bold';
        return 'text-blue-500 font-bold';
    };

    const formatRupiah = (angka) => {
        if (!angka) return '-';
        return Number(angka).toLocaleString('id-ID');
    };

    return (
        <ManajemenLayout>
            <Head title={'Evaluasi - ' + pegawai.nama_pegawai} />

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

            {/* Profile Pegawai */}
            <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center w-20 h-20 mb-3 text-2xl font-black rounded-full bg-red-50 text-[#FF2D55]">
                    {pegawai.nama_pegawai.substring(0, 2).toUpperCase()}
                </div>
                <p className="text-lg font-extrabold text-gray-800">{pegawai.nama_pegawai}</p>
                <p className="mb-4 text-sm text-gray-400">{pegawai.posisi_pegawai}</p>

                <select
                    value={rehire}
                    onChange={e => {
                        setRehire(e.target.value);
                        router.patch(route('manajemen.evaluasi.rehire', pegawai.id_pegawai), {
                            rekomendasi_rehire: e.target.value,
                        }, { preserveScroll: true });
                    }}
                    className={'pl-5 pr-8 py-2 text-sm font-bold rounded-full cursor-pointer appearance-none ' + (
                        rehire === 'Yes'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-100 text-red-600'
                    )}
                >
                    <option value="Yes">Rehire: Yes</option>
                    <option value="No">Rehire: No</option>
                </select>
            </div>

            {/* Flash */}
            {flash?.success && (
                <div className="p-3 mb-6 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl text-center">
                    ✅ {flash.success}
                </div>
            )}

            {/* Closing Rate — khusus Event Marketing (dipindah dari Manajemen Pegawai) */}
            {isEM && stats && (
                <>
                    <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900">Closing Rate</h3>
                                <p className="text-xs text-gray-400">Klien dari appointment yang akhirnya menjadi event di Laksamana Muda</p>
                            </div>
                            <span className="text-4xl font-black text-[#FF2D55]">{stats.closing_rate}%</span>
                        </div>
                        <div className="w-full h-3 overflow-hidden bg-gray-100 rounded-full">
                            <div className="h-3 rounded-full bg-[#FF2D55] transition-all" style={{ width: `${stats.closing_rate}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            <b className="text-gray-800">{stats.klien_closing}</b> dari <b className="text-gray-800">{stats.klien_dihandle}</b> klien yang ditangani sudah memiliki event.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3">
                        <StatCard title="Klien Di-handle"      value={stats.klien_dihandle}      icon={<Users size={20} />}         color="#FF2D55" />
                        <StatCard title="Klien Closing"         value={stats.klien_closing}       icon={<CheckCircle size={20} />}   color="#FF2D55" />
                        <StatCard title="Closing Rate"          value={`${stats.closing_rate}%`}  icon={<TrendingUp size={20} />}    color="#FF2D55" />
                        <StatCard title="Appointment Ditangani" value={stats.total_appointment}   icon={<Calendar size={20} />}      color="#FF2D55" />
                        <StatCard title="Appointment Selesai"   value={stats.appointment_selesai} icon={<CalendarCheck size={20} />} color="#FF2D55" />
                        <StatCard title="Event sebagai PIC"     value={stats.total_event_pic}     icon={<Layout size={20} />}        color="#FF2D55" />
                    </div>

                    <div className="mb-8 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
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
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${c.closed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {c.closed ? 'Closing' : 'Belum'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                            <p className="font-bold">Belum ada klien yang ditangani.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Note Card */}
            <div className="p-6 mb-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <StickyNote size={16} className="text-yellow-500" />
                    <h2 className="text-sm font-extrabold text-gray-800">Catatan untuk {pegawai.nama_pegawai}</h2>
                    <span className="text-[10px] text-gray-400 font-medium ml-1">— hanya bisa dibaca oleh pegawai bersangkutan</span>
                </div>
                <form onSubmit={e => {
                    e.preventDefault();
                    noteForm.patch(route('manajemen.pegawai.note', pegawai.id_pegawai), { preserveScroll: true });
                }}>
                    <textarea
                        rows={4}
                        value={noteForm.data.note_pegawai}
                        onChange={e => noteForm.setData('note_pegawai', e.target.value)}
                        placeholder="Tulis catatan evaluasi, saran, atau pesan khusus untuk pegawai ini..."
                        className="w-full p-4 text-sm border border-gray-200 rounded-xl bg-gray-50 resize-none focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100 transition-all"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-400">
                            {noteForm.data.note_pegawai?.length || 0} karakter
                            {pegawai.note_pegawai && <span className="ml-2 text-yellow-600 font-semibold">● Note aktif</span>}
                        </p>
                        <div className="flex gap-2">
                            {noteForm.data.note_pegawai && (
                                <button type="button"
                                    onClick={() => noteForm.setData('note_pegawai', '')}
                                    className="px-4 py-2 text-xs font-bold text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                    Hapus Note
                                </button>
                            )}
                            <button type="submit" disabled={noteForm.processing}
                                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">
                                <Save size={13} />
                                {noteForm.processing ? 'Menyimpan...' : 'Simpan Note'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Tabel Event */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List Event</h2>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-10 px-6 py-3 text-xs font-bold text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Event</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Tanggal</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Jam</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Pax</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Deal</th>
                            <th className="px-6 py-3 text-xs font-bold text-left text-white uppercase">Tugas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length > 0 ? events.map((event, index) => (
                            <Fragment key={event.id_event}>
                                <tr className="transition-colors border-b border-gray-50 hover:bg-gray-50/60">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">{event.nama_event}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatTanggal(event.tgl_mulai_event)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{event.jam_mulai} - {event.jam_selesai}</td>
                                    <td className="px-6 py-4 text-sm text-gray-800">{event.jumlah_pax ?? '-'}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">{formatRupiah(event.deal_harga_event)}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggle(event.id_event)}
                                            className={'flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ' + (
                                                expanded[event.id_event]
                                                    ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                                                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                            )}
                                        >
                                            {expanded[event.id_event] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            Tugas
                                        </button>
                                    </td>
                                </tr>

                                {expanded[event.id_event] && (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-3 bg-gray-50">
                                            {event.tugas && event.tugas.length > 0 ? (
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="text-xs text-gray-400 uppercase">
                                                            <th className="w-8 py-2 text-left">No</th>
                                                            <th className="py-2 text-left">To Do List</th>
                                                            <th className="py-2 text-left">Status</th>
                                                            <th className="py-2 text-left">Start</th>
                                                            <th className="py-2 text-left">Deadline</th>
                                                            <th className="py-2 text-left">Done</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {event.tugas.map((t, ti) => (
                                                            <tr key={t.id_tugas} className="text-sm border-t border-gray-100">
                                                                <td className="py-2 text-gray-400">{ti + 1}</td>
                                                                <td className="py-2 font-medium text-gray-700">{t.nama_tugas}</td>
                                                                <td className={'py-2 ' + getStatusColor(t.status_tugas)}>{t.status_tugas}</td>
                                                                <td className="py-2 text-gray-500">
                                                                    {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                                                                </td>
                                                                <td className="py-2 text-gray-500">
                                                                    {t.deadline_tugas ? new Date(t.deadline_tugas).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                                                                </td>
                                                                <td className="py-2 text-gray-500">
                                                                    {t.status_tugas === 'Done' ? new Date(t.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="py-2 text-sm text-center text-gray-400">Belum ada tugas untuk event ini.</p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada event untuk pegawai ini.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ManajemenLayout>
    );
}

