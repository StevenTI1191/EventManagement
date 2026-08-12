import ManajemenLayout from '@/Layouts/ManajemenLayout';
import StatCard from '@/Components/StatCard';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Save, StickyNote, Users, TrendingUp, CheckCircle, Calendar, CalendarCheck, Layout, Wallet, Target } from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, Tooltip,
    XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';

const rupiah = (v) =>
    'Rp ' + Number(v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

// Sumbu Y ringkas: 1.500.000 -> 1,5jt
const rupiahRingkas = (v) => {
    const n = Number(v ?? 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + 'M';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'jt';
    if (n >= 1e3) return Math.round(n / 1e3) + 'rb';
    return String(n);
};

export default function PegawaiDetail({ auth, pegawai, events, stats, tren = [], sebaran = [], clients = [], eventsDiassign = [], isEM }) {
    const [bukaTodo, setBukaTodo] = useState({});
    const toggleTodo = (id) => setBukaTodo((s) => ({ ...s, [id]: !s[id] }));
    const fmtTgl = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
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
                    <option value="Yes">Dipekerjakan lagi: Direkomendasikan</option>
                    <option value="No">Dipekerjakan lagi: Tidak direkomendasikan</option>
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
                            <b className="text-gray-800">{stats.klien_closing}</b> dari <b className="text-gray-800">{stats.klien_dihandle}</b> klien yang ditangani berhasil mencapai kesepakatan bersamanya.
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

                    {/* ── KINERJA OMSET ────────────────────────────────────── */}
                    <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet size={18} className="text-[#FF2D55]" />
                            <h2 className="text-base font-extrabold text-gray-800">Kinerja Omset</h2>
                        </div>
                        <p className="mb-5 text-xs text-gray-400">
                            Nilai deal = kesepakatan event yang sudah terikat komitmen. Uang masuk = pembayaran yang benar-benar tercatat.
                        </p>

                        <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-3">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Nilai Deal</p>
                                <p className="mt-1 text-lg font-extrabold text-gray-900">{rupiah(stats.nilai_deal)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50">
                                <p className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">Uang Masuk</p>
                                <p className="mt-1 text-lg font-extrabold text-emerald-700">{rupiah(stats.uang_masuk)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-amber-50">
                                <p className="text-[10px] font-bold tracking-wider text-amber-600 uppercase">Target Omset</p>
                                <p className="mt-1 text-lg font-extrabold text-amber-700">
                                    {stats.target_omset > 0 ? rupiah(stats.target_omset) : '—'}
                                </p>
                                {/* Asal angkanya, supaya nilai yang terlihat janggal bisa ditelusuri */}
                                {stats.event_bertarget > 0 && (
                                    <p className="mt-0.5 text-[10px] text-amber-600/80">
                                        dari {stats.event_bertarget} event bertarget
                                    </p>
                                )}
                            </div>
                        </div>

                        {stats.capaian_target !== null && stats.capaian_target !== undefined ? (
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-gray-500">
                                        Capaian terhadap target
                                        <span className="ml-1 font-normal text-gray-400">
                                            ({rupiah(stats.realisasi_target)} dari {stats.event_bertarget} event bertarget)
                                        </span>
                                    </span>
                                    <span className={`text-sm font-black ${stats.capaian_target >= 100 ? 'text-emerald-600' : 'text-[#FF2D55]'}`}>
                                        {stats.capaian_target}%
                                    </span>
                                </div>
                                <div className="w-full h-3 overflow-hidden bg-gray-100 rounded-full">
                                    <div className="h-3 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, stats.capaian_target)}%`,
                                            background: stats.capaian_target >= 100 ? '#10b981' : '#FF2D55',
                                        }} />
                                </div>
                            </div>
                        ) : (
                            <p className="mb-5 text-xs text-gray-400">
                                Belum ada target omset yang dipasang pada event yang dipegang — isi Target Omset saat membuat Planning Event agar capaiannya terukur.
                            </p>
                        )}

                        <p className="mb-2 text-xs font-bold text-gray-500">Tren 12 bulan terakhir</p>
                        <ResponsiveContainer width="100%" height={230}>
                            <LineChart data={tren}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={rupiahRingkas} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip formatter={(v) => rupiah(v)} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="deal" name="Nilai deal" stroke="#FF2D55" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="masuk" name="Uang masuk" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ── SEBARAN EVENT PER STATUS ─────────────────────────── */}
                    {sebaran.length > 0 && (
                        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Target size={18} className="text-[#FF2D55]" />
                                <h2 className="text-base font-extrabold text-gray-800">Sebaran Event yang Dipegang</h2>
                            </div>
                            <p className="mb-4 text-xs text-gray-400">Jumlah event per tahap — melihat di mana beban kerjanya menumpuk.</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={sebaran} barCategoryGap="35%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                                    <Tooltip />
                                    <Bar dataKey="jumlah" name="Event" fill="#FF2D55" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="mb-8 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-base font-extrabold text-gray-800">Klien yang Ditangani ({clients.length})</h2>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full">
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
                        </table></div>
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

            {/* Tabel To-Do yang di-assign ke pegawai ini — per event, dropdown detail */}
            <div className="mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">Event dengan To-Do yang Ditugaskan</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Jobdesk yang dipegang pegawai ini di tiap event. Klik untuk melihat rinciannya.</p>
                </div>
                {eventsDiassign.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {eventsDiassign.map((ev) => (
                            <div key={ev.id_event}>
                                <button onClick={() => toggleTodo(ev.id_event)}
                                    className="flex items-center w-full gap-4 px-6 py-4 text-left hover:bg-gray-50/60">
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${bukaTodo[ev.id_event] ? 'rotate-180' : ''}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{ev.nama_event}</p>
                                        <p className="text-xs text-gray-400">{fmtTgl(ev.tgl)} · {ev.status}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full shrink-0 ${
                                        ev.done === ev.total ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {ev.done}/{ev.total} tugas
                                    </span>
                                </button>
                                {bukaTodo[ev.id_event] && (
                                    <div className="px-6 pb-4 space-y-1.5 bg-gray-50/40">
                                        {ev.tugas.map((t) => (
                                            <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-xl">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                    t.status === 'Done' ? 'bg-green-500' : t.progress > 0 ? 'bg-amber-400' : 'bg-gray-300'
                                                }`} />
                                                <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{t.nama}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">{t.kategori}</span>
                                                <span className="text-[10px] font-bold text-gray-500 shrink-0">{t.progress}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="px-6 py-10 text-sm text-center text-gray-400">Belum ada to-do yang ditugaskan ke pegawai ini.</p>
                )}
            </div>

            {/* Tabel Event yang dipegang sebagai PIC event */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List Event</h2>
                </div>
                <div className="overflow-x-auto"><table className="w-full">
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
                                                <div className="overflow-x-auto"><table className="w-full">
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
                                                </table></div>
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
                </table></div>
            </div>
        </ManajemenLayout>
    );
}

