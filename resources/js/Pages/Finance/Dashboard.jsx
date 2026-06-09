import React, { useState } from 'react';
import FinanceLayout from '@/Layouts/FinanceLayout';
import { Head, usePage } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Wallet, AlertCircle,
    ArrowDownLeft, ArrowUpRight, BarChart2, Clock
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const fmt = (v) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);

const fmtShort = (v) => {
    if (!v) return 'Rp 0';
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}K`;
    return `Rp ${v}`;
};

const fmtTanggal = (tgl) => {
    if (!tgl) return '-';
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-4 py-3 text-sm bg-white border border-gray-100 shadow-xl rounded-2xl">
            <p className="mb-2 font-bold text-gray-700">{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

export default function FinanceDashboard({ kpi, chartData, recentTransaksi, topEvents }) {
    const { auth } = usePage().props;

    const kpiCards = [
        {
            label: 'Total Penjualan',
            value: fmtShort(kpi.totalPenjualan),
            full: fmt(kpi.totalPenjualan),
            icon: <ArrowDownLeft size={22} />,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-100',
            trend: '+',
        },
        {
            label: 'Total Pengeluaran',
            value: fmtShort(kpi.totalPengeluaran),
            full: fmt(kpi.totalPengeluaran),
            icon: <ArrowUpRight size={22} />,
            color: 'text-red-500',
            bg: 'bg-red-50',
            border: 'border-red-100',
        },
        {
            label: 'Laba Bersih',
            value: fmtShort(kpi.labaBersih),
            full: fmt(kpi.labaBersih),
            icon: kpi.labaBersih >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />,
            color: kpi.labaBersih >= 0 ? 'text-blue-600' : 'text-orange-500',
            bg:    kpi.labaBersih >= 0 ? 'bg-blue-50'   : 'bg-orange-50',
            border: kpi.labaBersih >= 0 ? 'border-blue-100' : 'border-orange-100',
        },
        {
            label: 'Piutang (Sisa Belum Bayar)',
            value: fmtShort(kpi.totalPiutang),
            full: fmt(kpi.totalPiutang),
            icon: <AlertCircle size={22} />,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-100',
            sub: `${kpi.eventBelumLunas} event belum lunas`,
        },
        {
            label: 'Total Deal (Kontrak)',
            value: fmtShort(kpi.totalDeal),
            full: fmt(kpi.totalDeal),
            icon: <Wallet size={22} />,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
        },
    ];

    return (
        <FinanceLayout>
            <Head title="Finance Dashboard" />

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Finance Dashboard</h1>
                <p className="mt-1 font-medium text-gray-500">
                    Selamat Datang, <span className="text-[#FF2D55] font-bold">{auth.user.nama_pegawai}</span>!
                    <span className="ml-2 text-xs text-gray-400">Tahun {new Date().getFullYear()}</span>
                </p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-2 xl:grid-cols-5">
                {kpiCards.map((card) => (
                    <div key={card.label}
                        className={`p-5 bg-white border ${card.border} rounded-2xl shadow-sm group hover:shadow-md transition-shadow`}>
                        <div className="flex items-start justify-between mb-3">
                            <p className="text-xs font-semibold leading-tight text-gray-500">{card.label}</p>
                            <div className={`${card.bg} ${card.color} p-2 rounded-xl`}>
                                {card.icon}
                            </div>
                        </div>
                        <p className={`text-2xl font-extrabold ${card.color}`}>{card.value}</p>
                        {card.sub && (
                            <p className="mt-1 text-xs font-medium text-gray-400">{card.sub}</p>
                        )}
                        <p className="mt-1 text-[10px] text-gray-300 truncate" title={card.full}>{card.full}</p>
                    </div>
                ))}
            </div>

            {/* CHART + RECENT TRANSAKSI */}
            <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">

                {/* Bar Chart */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Pemasukan vs Pengeluaran</h3>
                            <p className="text-xs text-gray-400">Per bulan — {new Date().getFullYear()}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e]" />
                                Pemasukan
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-3 h-3 rounded-full bg-[#FF2D55]" />
                                Pengeluaran
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={70} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="pemasukan"   name="Pemasukan"   fill="#22c55e" radius={[6,6,0,0]} />
                            <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#FF2D55" radius={[6,6,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Transaksi Terbaru */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-2 mb-5">
                        <Clock size={16} className="text-gray-400" />
                        <h3 className="text-base font-extrabold text-gray-900">Pembayaran Terbaru</h3>
                    </div>
                    <div className="space-y-3">
                        {recentTransaksi?.length > 0 ? recentTransaksi.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{t.nama_event}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{t.client} · {fmtTanggal(t.tgl_bayar)}</p>
                                </div>
                                <span className="text-xs font-extrabold text-green-600 shrink-0">
                                    +{fmtShort(t.nominal)}
                                </span>
                            </div>
                        )) : (
                            <p className="py-6 text-sm text-center text-gray-400">Belum ada transaksi.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* TOP EVENTS BY DEAL */}
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center gap-2 mb-5">
                    <BarChart2 size={16} className="text-gray-400" />
                    <h3 className="text-base font-extrabold text-gray-900">Top Event by Nilai Deal</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-3 text-xs font-bold text-left text-gray-400">Event</th>
                                <th className="pb-3 text-xs font-bold text-left text-gray-400">Client</th>
                                <th className="pb-3 text-xs font-bold text-right text-gray-400">Deal</th>
                                <th className="pb-3 text-xs font-bold text-right text-gray-400">Terbayar</th>
                                <th className="pb-3 text-xs font-bold text-right text-gray-400">Sisa</th>
                                <th className="pb-3 text-xs font-bold text-center text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {topEvents.length > 0 ? topEvents.map((e, i) => (
                                <tr key={e.id_event ?? (e.nama_event + '-' + i)} className="transition-colors hover:bg-gray-50/60">
                                    <td className="py-3 text-sm font-semibold text-gray-800">{e.nama_event}</td>
                                    <td className="py-3 text-sm text-gray-500">{e.client}</td>
                                    <td className="py-3 text-sm font-bold text-right text-gray-800">{fmt(e.deal)}</td>
                                    <td className="py-3 text-sm font-semibold text-right text-green-600">{fmt(e.dibayar)}</td>
                                    <td className="py-3 text-sm font-semibold text-right text-red-500">{fmt(e.sisa)}</td>
                                    <td className="py-3 text-center">
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${
                                            e.status === 'Lunas'
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-red-50 text-[#FF2D55]'
                                        }`}>
                                            {e.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-10 text-sm text-center text-gray-400">Belum ada data.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </FinanceLayout>
    );
}
