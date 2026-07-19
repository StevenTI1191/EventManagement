import { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import {
    GitBranch, Eye, Building2, CalendarDays, MapPin, User, GripVertical,
    FileDown, MessageCircle, XCircle, X, LayoutGrid, Table2, Lightbulb, Lock,
} from 'lucide-react';

// Tiga tahap pertama boleh digeser. Sisanya ditentukan pembayaran & jadwal,
// jadi ditampilkan sebagai informasi saja — menyeret ke sana akan melompati DP.
const KOLOM = [
    { key: 'Lead',         judul: 'Lead',         warna: 'bg-slate-500',   tint: 'bg-slate-50',   ket: 'Calon & rencana bertarget klien', geser: true },
    { key: 'Negotiation',  judul: 'Negotiation',  warna: 'bg-amber-500',   tint: 'bg-amber-50',   ket: 'Penawaran dikirim',                geser: true },
    { key: 'Deal',         judul: 'Deal',         warna: 'bg-emerald-600', tint: 'bg-emerald-50', ket: 'Disetujui — menunggu DP',          geser: true },
    { key: 'Upcoming',     judul: 'Upcoming',     warna: 'bg-blue-500',    tint: 'bg-blue-50',    ket: 'DP lunas — acara berjalan',        geser: false },
    { key: 'Penyelesaian', judul: 'Penyelesaian', warna: 'bg-orange-500',  tint: 'bg-orange-50',  ket: 'Acara lewat, belum tuntas',        geser: false },
    { key: 'Done',         judul: 'Done',         warna: 'bg-gray-500',    tint: 'bg-gray-50',    ket: 'Selesai (tampil 3 hari)',          geser: false },
];

const rupiah = (n) =>
    n == null ? '—' : 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const tanggal = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export default function PipelineBoard({ Layout, kolom = {}, canEdit = false, routes = {} }) {
    const [dragId, setDragId] = useState(null);
    const [hover, setHover] = useState(null);
    const [error, setError] = useState('');
    const [tampilan, setTampilan] = useState('papan');
    const [batalKartu, setBatalKartu] = useState(null);
    const [alasan, setAlasan] = useState('');
    const [submitBatal, setSubmitBatal] = useState(false);

    const semua = Object.values(kolom).flat();
    const total = semua.length;

    const bisaGeser = (key) => KOLOM.find((k) => k.key === key)?.geser;

    // Kartu bisa diklik untuk membuka form event. Seretan tidak boleh ikut
    // memicu navigasi, jadi klik diabaikan bila baru saja terjadi drag.
    const [baruDigeser, setBaruDigeser] = useState(false);
    // Menuju halaman detail event, bukan langsung form: di sana ada ringkasan,
    // daftar periksa kelengkapan, dan follow-up — form editnya di bagian bawah.
    // Penanda "dari" dipakai agar tombol kembali pulang ke papan ini.
    const bukaEvent = (e) => {
        if (baruDigeser || !routes.detail) return;
        router.visit(route(routes.detail, { id: e.id_event, dari: 'pipeline' }));
    };

    const jatuhkan = (statusTujuan) => {
        setHover(null);
        if (!canEdit || !dragId || !bisaGeser(statusTujuan)) { setDragId(null); return; }
        const kartu = semua.find((e) => e.id_event === dragId);
        setDragId(null);
        if (!kartu || kartu.status_event === statusTujuan) return;

        setError('');
        router.put(
            route(routes.updateStatus, kartu.id_event),
            { status_event: statusTujuan },
            { preserveScroll: true, onError: (err) => setError(err.status_event || 'Gagal memindahkan event.') },
        );
    };

    const kirimBatal = () => {
        if (!batalKartu) return;
        setSubmitBatal(true);
        router.put(
            route(routes.batal, batalKartu.id_event),
            { alasan },
            {
                preserveScroll: true,
                onSuccess: () => { setBatalKartu(null); setAlasan(''); },
                onError: (err) => setError(err.alasan || 'Gagal menandai prospek tidak jadi.'),
                onFinish: () => setSubmitBatal(false),
            },
        );
    };

    return (
        <Layout>
            <Head title="Pipeline Event — Laksamana Muda" />

            <div className="mb-5">
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
                    <span className="px-3 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-full">{total} event</span>

                    {/* Ganti tampilan papan / tabel */}
                    <div className="flex gap-1 p-1 ml-auto bg-gray-100 rounded-xl">
                        {[
                            { key: 'papan', label: 'Papan', icon: LayoutGrid },
                            { key: 'tabel', label: 'Tabel', icon: Table2 },
                        ].map((t) => (
                            <button key={t.key} type="button" onClick={() => setTampilan(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                    tampilan === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                <t.icon size={13} /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">
                    Lead → Negotiation → Deal ditentukan tim.{' '}
                    <span className="text-gray-400">Upcoming ke atas mengikuti pembayaran &amp; jadwal, jadi tidak bisa digeser.</span>
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-4 mb-4 border border-red-200 bg-red-50 rounded-2xl">
                    <span className="text-lg leading-none">⚠️</span>
                    <p className="mt-0.5 text-sm font-medium text-red-600">{error}</p>
                </div>
            )}

            {tampilan === 'papan' ? (
                /* ── PAPAN: gulir mendatar, kolom rapat ── */
                <div className="flex gap-4 pb-4 -mx-1 overflow-x-auto">
                    {KOLOM.map((k) => {
                        const kartu = kolom[k.key] || [];
                        const aktif = hover === k.key && canEdit && k.geser;
                        return (
                            <div
                                key={k.key}
                                onDragOver={(e) => { if (canEdit && k.geser) { e.preventDefault(); setHover(k.key); } }}
                                onDragLeave={() => setHover(null)}
                                onDrop={() => jatuhkan(k.key)}
                                className={`w-[248px] shrink-0 rounded-2xl border p-3 transition-all ${
                                    aktif ? 'border-[#FF2D55] bg-pink-50/50 ring-2 ring-[#FF2D55]/20' : 'border-gray-100 ' + k.tint
                                }`}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${k.warna}`} />
                                        <h2 className="text-sm font-extrabold text-gray-900 truncate">{k.judul}</h2>
                                    </div>
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full">
                                        {kartu.length}
                                    </span>
                                </div>
                                <p className="mb-3 text-[10px] leading-tight text-gray-400">{k.ket}</p>

                                <div className="space-y-2 min-h-[5rem]">
                                    {kartu.length === 0 && (
                                        <div className="flex items-center justify-center text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg h-14">
                                            Kosong
                                        </div>
                                    )}

                                    {kartu.map((e) => (
                                        <div
                                            key={e.id_event}
                                            draggable={canEdit && k.geser}
                                            onDragStart={() => { setDragId(e.id_event); setBaruDigeser(true); }}
                                            onDragEnd={() => {
                                                setDragId(null); setHover(null);
                                                // beri jeda singkat agar klik sisa seretan tidak ikut membuka event
                                                setTimeout(() => setBaruDigeser(false), 100);
                                            }}
                                            onClick={() => bukaEvent(e)}
                                            title={routes.detail ? 'Klik untuk membuka detail event' : undefined}
                                            className={`p-2.5 bg-white border rounded-lg shadow-sm transition-all hover:shadow-md hover:border-gray-300 ${
                                                routes.detail ? 'cursor-pointer' : ''
                                            } ${dragId === e.id_event ? 'opacity-50' : 'border-gray-100'}`}
                                        >
                                            <div className="flex items-start gap-1.5">
                                                {canEdit && k.geser && (
                                                    <GripVertical size={13} className="mt-0.5 text-gray-300 shrink-0 cursor-grab active:cursor-grabbing"
                                                        title="Seret untuk memindahkan tahap" />
                                                )}
                                                <h3 className="flex-1 text-xs font-bold leading-snug text-gray-900 line-clamp-2">{e.nama_event}</h3>
                                            </div>

                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {e.dari_planning && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 rounded">
                                                        <Lightbulb size={9} /> RENCANA
                                                    </span>
                                                )}
                                                {/* Sudah diterima klien → tahapnya terkunci, tidak bisa mundur */}
                                                {e.respon_klien === 'Diterima' && (
                                                    <span title="Penawaran sudah diterima klien — tahap tidak bisa dimundurkan"
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 bg-emerald-50 rounded">
                                                        <Lock size={9} /> DITERIMA KLIEN
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 space-y-1 text-[10px] text-gray-500">
                                                <p className="flex items-center gap-1">
                                                    <Building2 size={10} className="shrink-0" />
                                                    <span className="truncate">{e.client?.perusahaan_client || e.client?.nama_client || 'Tanpa klien'}</span>
                                                </p>
                                                <p className="flex items-center gap-1">
                                                    <CalendarDays size={10} className="shrink-0" /> {tanggal(e.tgl_mulai_event)}
                                                    {e.area_event && (
                                                        <>
                                                            <MapPin size={10} className="ml-1 shrink-0" />
                                                            <span className="truncate">{e.area_event}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>

                                            <p className="mt-2 text-xs font-extrabold text-[#FF2D55]">{rupiah(e.deal_harga_event)}</p>

                                            {canEdit && routes.penawaran && (k.key === 'Negotiation' || k.key === 'Deal') && (
                                                <div className="flex flex-wrap gap-1 mt-2" onClick={(ev) => ev.stopPropagation()}>
                                                    <a href={route(routes.penawaran, e.id_event)} draggable={false}
                                                        className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                                                        <FileDown size={10} /> PDF
                                                    </a>
                                                    {e.wa_penawaran ? (
                                                        <a href={e.wa_penawaran} target="_blank" rel="noopener noreferrer" draggable={false}
                                                            className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-emerald-700 rounded bg-emerald-50 hover:bg-emerald-100">
                                                            <MessageCircle size={10} /> WA
                                                        </a>
                                                    ) : (
                                                        <span title="Nomor WhatsApp klien belum diisi"
                                                            className="px-1.5 py-1 text-[9px] font-bold text-gray-400 rounded bg-gray-50">
                                                            No. WA —
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {canEdit && routes.batal && (k.key === 'Lead' || k.key === 'Negotiation') && !e.dari_planning && (
                                                <button type="button"
                                                    onClick={(ev) => { ev.stopPropagation(); setError(''); setAlasan(''); setBatalKartu(e); }}
                                                    className="flex items-center gap-0.5 mt-1.5 px-1.5 py-1 text-[9px] font-bold text-rose-600 rounded bg-rose-50 hover:bg-rose-100">
                                                    <XCircle size={10} /> Tidak jadi
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── TABEL: ringkasan seluruh pipeline ── */
                <div className="overflow-x-auto bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <table className="w-full min-w-[860px]">
                        <thead>
                            <tr className="bg-[#FF2D55]">
                                {['Event', 'Klien', 'Tahap', 'Tanggal', 'Area', 'PIC', 'Nilai'].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-[11px] font-bold text-white uppercase ${h === 'Nilai' ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {total === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-sm text-center text-gray-400">Belum ada event di pipeline.</td></tr>
                            ) : (
                                KOLOM.flatMap((k) => (kolom[k.key] || []).map((e) => ({ ...e, _kolom: k }))).map((e) => (
                                    <tr key={e.id_event}
                                        onClick={() => bukaEvent(e)}
                                        title={routes.detail ? 'Klik untuk membuka detail event' : undefined}
                                        className={`transition-colors hover:bg-gray-50/60 ${routes.detail ? 'cursor-pointer' : ''}`}>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-bold text-gray-900">{e.nama_event}</span>
                                            {e.dari_planning && (
                                                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 rounded">RENCANA</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {e.client?.perusahaan_client || e.client?.nama_client || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                                <span className={`w-1.5 h-1.5 rounded-full ${e._kolom.warna}`} />
                                                {e._kolom.judul}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{tanggal(e.tgl_mulai_event)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{e.area_event || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{e.pic?.nama_pegawai || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-extrabold text-right text-[#FF2D55]">{rupiah(e.deal_harga_event)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {total > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50">
                                    <td colSpan={6} className="px-4 py-3 text-xs font-bold text-right text-gray-500">Total nilai pipeline</td>
                                    <td className="px-4 py-3 text-sm font-extrabold text-right text-gray-900">
                                        {rupiah(semua.reduce((a, e) => a + (Number(e.deal_harga_event) || 0), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {batalKartu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => !submitBatal && setBatalKartu(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <XCircle size={20} className="text-rose-600" />
                                <h3 className="text-lg font-extrabold text-gray-900">Tandai tidak jadi</h3>
                            </div>
                            <button type="button" onClick={() => !submitBatal && setBatalKartu(null)}
                                className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="mt-3 text-sm text-gray-600">
                            Prospek <span className="font-bold text-gray-900">"{batalKartu.nama_event}"</span> akan
                            dikeluarkan dari pipeline dan jadwalnya dilepas. Riwayatnya tetap tersimpan.
                        </p>

                        <label className="block mt-4 mb-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase">
                            Alasan <span className="font-medium normal-case text-gray-400">(opsional)</span>
                        </label>
                        <textarea value={alasan} onChange={(ev) => setAlasan(ev.target.value)} rows={3} maxLength={500}
                            placeholder="Mis. klien memilih vendor lain, budget tidak cocok, tanggal bentrok…"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none focus:ring-2 focus:ring-[#FF2D55]/20" />

                        <div className="flex justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setBatalKartu(null)} disabled={submitBatal}
                                className="px-4 py-2 text-sm font-bold text-gray-600 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-60">
                                Batal
                            </button>
                            <button type="button" onClick={kirimBatal} disabled={submitBatal}
                                className="px-4 py-2 text-sm font-bold text-white transition-colors bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-60">
                                {submitBatal ? 'Menyimpan…' : 'Ya, tidak jadi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
