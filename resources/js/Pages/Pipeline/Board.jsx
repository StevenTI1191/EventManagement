import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { GitBranch, Eye, Building2, CalendarDays, MapPin, User, GripVertical, FileDown, MessageCircle } from 'lucide-react';

const KOLOM = [
    { key: 'Lead',        judul: 'Lead',        warna: 'bg-slate-500',   tint: 'bg-slate-50',   ket: 'Calon dari appointment / hasil approach' },
    { key: 'Negotiation', judul: 'Negotiation', warna: 'bg-amber-500',   tint: 'bg-amber-50',   ket: 'Detail lengkap — penawaran dikirim' },
    { key: 'Deal',        judul: 'Deal',        warna: 'bg-emerald-600', tint: 'bg-emerald-50', ket: 'Disetujui klien — lanjut DP 50% di Finance' },
];

const rupiah = (n) =>
    n == null ? '—' : 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const tanggal = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function PipelineBoard({ Layout, kolom = {}, canEdit = false, routes = {} }) {
    const [dragId, setDragId] = useState(null);
    const [hover, setHover] = useState(null);
    const [error, setError] = useState('');

    const jatuhkan = (statusTujuan) => {
        setHover(null);
        if (!canEdit || !dragId) return;
        const kartu = Object.values(kolom).flat().find((e) => e.id_event === dragId);
        setDragId(null);
        if (!kartu || kartu.status_event === statusTujuan) return;

        setError('');
        router.put(
            route(routes.updateStatus, kartu.id_event),
            { status_event: statusTujuan },
            {
                preserveScroll: true,
                onError: (err) => setError(err.status_event || 'Gagal memindahkan event.'),
            },
        );
    };

    const total = Object.values(kolom).reduce((a, c) => a + (c?.length || 0), 0);

    return (
        <Layout>
            <Head title="Pipeline Event — Laksamana Muda" />

            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <GitBranch size={24} className="text-[#FF2D55]" />
                        <h1 className="text-3xl font-extrabold text-gray-900">Pipeline Event</h1>
                    </div>
                    {!canEdit && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-full">
                            <Eye size={13} /> Hanya lihat
                        </span>
                    )}
                    <span className="px-3 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-full">
                        {total} event
                    </span>
                </div>
                <p className="mt-1 font-medium text-gray-500">
                    Alur event dari klien: Lead → Negotiation → Deal.{' '}
                    {canEdit
                        ? 'Geser kartu untuk memindahkan tahap.'
                        : 'Pemindahan tahap dilakukan oleh Event Marketing / Manajemen.'}
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-4 mb-5 border border-red-200 bg-red-50 rounded-2xl">
                    <span className="text-lg leading-none">⚠️</span>
                    <p className="mt-0.5 text-sm font-medium text-red-600">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {KOLOM.map((k) => {
                    const kartu = kolom[k.key] || [];
                    const aktif = hover === k.key && canEdit;
                    return (
                        <div
                            key={k.key}
                            onDragOver={(e) => { if (canEdit) { e.preventDefault(); setHover(k.key); } }}
                            onDragLeave={() => setHover(null)}
                            onDrop={() => jatuhkan(k.key)}
                            className={`rounded-[1.5rem] border p-4 transition-all ${
                                aktif ? 'border-[#FF2D55] bg-pink-50/50 ring-2 ring-[#FF2D55]/20' : 'border-gray-100 ' + k.tint
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${k.warna}`} />
                                    <h2 className="font-extrabold text-gray-900">{k.judul}</h2>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-bold text-gray-600 bg-white rounded-full border border-gray-200">
                                    {kartu.length}
                                </span>
                            </div>
                            <p className="mb-4 text-xs text-gray-400">{k.ket}</p>

                            <div className="space-y-3 min-h-[8rem]">
                                {kartu.length === 0 && (
                                    <div className="flex items-center justify-center h-28 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                        Belum ada event
                                    </div>
                                )}

                                {kartu.map((e) => (
                                    <div
                                        key={e.id_event}
                                        draggable={canEdit}
                                        onDragStart={() => setDragId(e.id_event)}
                                        onDragEnd={() => { setDragId(null); setHover(null); }}
                                        className={`p-4 bg-white border rounded-xl shadow-sm transition-all ${
                                            canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300' : ''
                                        } ${dragId === e.id_event ? 'opacity-50' : 'border-gray-100'}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {canEdit && <GripVertical size={15} className="mt-0.5 text-gray-300 shrink-0" />}
                                            <h3 className="flex-1 text-sm font-bold leading-snug text-gray-900">{e.nama_event}</h3>
                                        </div>

                                        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                                            <p className="flex items-center gap-1.5">
                                                <Building2 size={12} className="shrink-0" />
                                                <span className="truncate">
                                                    {e.client?.perusahaan_client || e.client?.nama_client || 'Tanpa klien'}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <CalendarDays size={12} className="shrink-0" /> {tanggal(e.tgl_mulai_event)}
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <MapPin size={12} className="shrink-0" />
                                                <span className="truncate">{e.area_event || '—'}</span>
                                            </p>
                                            {e.pic && (
                                                <p className="flex items-center gap-1.5">
                                                    <User size={12} className="shrink-0" />
                                                    <span className="truncate">{e.pic.nama_pegawai}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-3 mt-3 border-t border-gray-100">
                                            <p className="text-sm font-extrabold text-[#FF2D55]">{rupiah(e.deal_harga_event)}</p>

                                            {/* Penawaran hanya relevan setelah detail lengkap (Negotiation ke atas) */}
                                            {canEdit && routes.penawaran && (k.key === 'Negotiation' || k.key === 'Deal') && (
                                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                    <a
                                                        href={route(routes.penawaran, e.id_event)}
                                                        draggable={false}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gray-600 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                                                    >
                                                        <FileDown size={11} /> Penawaran
                                                    </a>
                                                    {e.wa_penawaran ? (
                                                        <a
                                                            href={e.wa_penawaran}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            draggable={false}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors rounded-md bg-emerald-50 hover:bg-emerald-100"
                                                        >
                                                            <MessageCircle size={11} /> Kirim WA
                                                        </a>
                                                    ) : (
                                                        <span
                                                            title="Nomor WhatsApp klien belum diisi"
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 rounded-md cursor-not-allowed"
                                                        >
                                                            <MessageCircle size={11} /> No. WA kosong
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
}
