import React from 'react';
import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { Head, Link } from '@inertiajs/react';
import StatCard from '@/Components/StatCard';
import {
    CheckCircle, Calendar, Layout,
    Wallet, ArrowRightLeft, Users, TrendingUp, Trophy
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell, Tooltip,
    XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Legend
} from 'recharts';

const fmt = (v) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);

const fmtShort = (v) => {
    const n = Number(v) || 0;
    const d = (x, dec = 1) => x.toLocaleString('id-ID', { maximumFractionDigits: dec });
    if (n >= 1_000_000_000) return `Rp ${d(n / 1_000_000_000)} M`;
    if (n >= 1_000_000)     return `Rp ${d(n / 1_000_000)} Jt`;
    if (n >= 1_000)         return `Rp ${d(n / 1_000, 0)} Rb`;
    return `Rp ${d(n, 0)}`;
};

const PIE_COLORS = ['#FF2D55','#ff6b35','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-4 py-3 text-sm bg-white border border-gray-100 shadow-xl rounded-2xl">
            <p className="mb-1 font-bold text-gray-700">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' && p.value > 999 ? fmtShort(p.value) : p.value}
                </p>
            ))}
        </div>
    );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 11, fontWeight: 700 }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function Dashboard({ auth, stats, recentEvents, salesChart, kategoriChart, clientTrend, topPic, statusChart }) {

    return (
        <ManajemenLayout>
            <Head title="Manajemen Dashboard" />

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
                <p className="font-medium text-gray-500">
                    Selamat Datang, <span className="text-[#FF2D55] font-bold">{auth.user.nama_pegawai}</span>!
                    <span className="ml-2 text-xs text-gray-400">{new Date().getFullYear()}</span>
                </p>
            </div>

            {/* ── STAT CARDS ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-3 xl:grid-cols-6">
                <StatCard title="Event Selesai"   value={stats.eventDone}                    icon={<CheckCircle size={22} />}    color="#FF2D55" />
                <StatCard title="Event Mendatang" value={stats.eventActive}                  icon={<Calendar size={22} />}       color="#FF2D55" />
                <StatCard title="Total Event"     value={stats.totalEvent}                   icon={<Layout size={22} />}         color="#FF2D55" />
                <StatCard title="Total Penjualan" value={fmtShort(stats.totalPenjualan)} hint={fmt(stats.totalPenjualan)} icon={<Wallet size={22} />} color="#FF2D55" />
                <StatCard title="Total Transaksi" value={stats.totalTransaksi}               icon={<ArrowRightLeft size={22} />} color="#FF2D55" />
                <StatCard title="Total Klien"     value={stats.totalClient}                  icon={<Users size={22} />}          color="#FF2D55" />
            </div>

            {/* ── ROW 1: Sales Chart + Event Status Donut ────── */}
            <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">

                {/* Sales per bulan */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Total Penjualan per Bulan</h3>
                            <p className="text-xs text-gray-400">{new Date().getFullYear()}</p>
                        </div>
                        <span className="text-[10px] font-bold text-white bg-[#FF2D55] px-3 py-1 rounded-full uppercase tracking-widest">
                            Realtime
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={salesChart} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={65} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" name="Penjualan" fill="#FF2D55" radius={[6,6,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Donut status event */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <h3 className="mb-1 text-base font-extrabold text-gray-900">Status Event</h3>
                    <p className="mb-4 text-xs text-gray-400">Distribusi berdasarkan status</p>
                    {statusChart?.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={170}>
                                <PieChart>
                                    <Pie data={statusChart} cx="50%" cy="50%"
                                        innerRadius={45} outerRadius={80}
                                        dataKey="value" labelLine={false}
                                        label={CustomPieLabel}>
                                        {statusChart.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v + ' event', n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                                {statusChart.map((item, i) => (
                                    <span key={i} className="flex items-center gap-1 text-[11px] text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {item.name} ({item.value})
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="py-10 text-sm text-center text-gray-400">Belum ada data.</p>
                    )}
                </div>
            </div>

            {/* ── ROW 2: Kategori Pie + Client Trend ─────────── */}
            <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">

                {/* Pie chart kategori */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <h3 className="mb-1 text-base font-extrabold text-gray-900">Event per Kategori</h3>
                    <p className="mb-4 text-xs text-gray-400">Distribusi jenis event</p>
                    {kategoriChart?.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={170}>
                                <PieChart>
                                    <Pie data={kategoriChart} cx="50%" cy="50%"
                                        outerRadius={80} dataKey="value"
                                        labelLine={false} label={CustomPieLabel}>
                                        {kategoriChart.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v + ' event', n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                                {kategoriChart.map((item, i) => (
                                    <span key={i} className="flex items-center gap-1 text-[11px] text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {item.name} ({item.value})
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="py-10 text-sm text-center text-gray-400">Belum ada data.</p>
                    )}
                </div>

                {/* Trend client baru */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-[#FF2D55]" />
                        <h3 className="text-base font-extrabold text-gray-900">Trend Client Baru</h3>
                    </div>
                    <p className="mb-5 text-xs text-gray-400">Pendaftaran client per bulan — {new Date().getFullYear()}</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={clientTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="total" name="Client Baru"
                                stroke="#FF2D55" strokeWidth={2.5}
                                dot={{ fill: '#FF2D55', r: 4 }}
                                activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── ROW 3: Top PIC + Recent Events ─────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Top PIC */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy size={16} className="text-yellow-500" />
                        <h3 className="text-base font-extrabold text-gray-900">Top PIC Event</h3>
                    </div>
                    <div className="space-y-3">
                        {topPic?.length > 0 ? topPic.map((p, i) => {
                            const maxTotal = topPic[0]?.total || 1;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                        i === 0 ? 'bg-yellow-400 text-white' :
                                        i === 1 ? 'bg-gray-300 text-gray-700' :
                                        i === 2 ? 'bg-orange-300 text-white' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold text-gray-800 truncate">{p.nama}</p>
                                            <span className="text-xs font-black text-[#FF2D55] ml-2 flex-shrink-0">{p.total}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-1.5 bg-[#FF2D55] rounded-full transition-all"
                                                style={{ width: `${(p.total / maxTotal) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="py-6 text-sm text-center text-gray-400">Belum ada data.</p>
                        )}
                    </div>
                </div>

                {/* Recent Events */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
                    <h3 className="mb-5 text-base font-extrabold text-gray-900">Event Terbaru</h3>
                    <div className="space-y-3">
                        {recentEvents?.length > 0 ? recentEvents.map(event => (
                            <Link key={event.id_event}
                                href={route('manajemen.event.index') + '?open=' + event.id_event}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-pink-50 transition-colors cursor-pointer">
                                <div className="flex-shrink-0 w-12 h-12 overflow-hidden rounded-xl bg-gray-200">
                                    {event.poster_event ? (
                                        <img src={`/${event.poster_event}`} alt={event.nama_event}
                                            className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full bg-pink-50">
                                            <span className="text-xs font-black text-[#FF2D55]">
                                                {event.nama_event?.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{event.nama_event}</p>
                                    <p className="text-xs text-gray-400">
                                        {event.client?.nama_client || '-'} · {event.tgl_mulai_event || '-'}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full flex-shrink-0 ${
                                    event.status_event === 'Done'      ? 'bg-green-50 text-green-600' :
                                    event.status_event === 'Upcoming'    ? 'bg-blue-50 text-blue-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                    {event.status_event || 'Upcoming'}
                                </span>
                            </Link>
                        )) : (
                            <p className="py-6 text-sm text-center text-gray-400">Belum ada event.</p>
                        )}
                    </div>
                </div>
            </div>
        </ManajemenLayout>
    );
}
