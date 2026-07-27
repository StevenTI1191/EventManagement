import { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import {
    GitBranch, Eye, Building2, CalendarDays, MapPin, User, GripVertical,
    FileDown, MessageCircle, XCircle, X, LayoutGrid, Table2, Lightbulb, Lock, ChevronDown,
    Clock, CheckCircle2, Send,
} from 'lucide-react';

// Tiga tahap pertama boleh digeser. Sisanya ditentukan pembayaran & jadwal,
// jadi ditampilkan sebagai informasi saja — menyeret ke sana akan melompati DP.
// Warnanya sengaja bergerak mengikuti perjalanan tahap — abu dingin saat masih
// calon, menghangat ketika ditawar, hijau begitu disetujui, lalu biru saat
// berjalan dan meredup ke abu setelah tuntas. Jadi posisi sebuah acara terbaca
// dari warnanya saja, tanpa perlu membaca judul kolomnya.
const KOLOM = [
    { key: 'Lead',         judul: 'Lead',         grad: 'from-slate-400 to-slate-500',    aksen: 'bg-slate-400',   tint: 'bg-slate-50/60',   ket: 'Calon & rencana bertarget klien', geser: true },
    { key: 'Negotiation',  judul: 'Negotiation',  grad: 'from-amber-400 to-orange-500',   aksen: 'bg-amber-400',   tint: 'bg-amber-50/60',   ket: 'Penawaran — disetujui Manajemen',  geser: true },
    { key: 'Deal',         judul: 'Deal',         grad: 'from-emerald-400 to-emerald-600', aksen: 'bg-emerald-500', tint: 'bg-emerald-50/60', ket: 'Disetujui — menunggu DP',          geser: true },
    { key: 'Upcoming',     judul: 'Upcoming',     grad: 'from-sky-400 to-blue-600',       aksen: 'bg-blue-500',    tint: 'bg-blue-50/60',    ket: 'DP lunas — acara berjalan',        geser: false },
    { key: 'Penyelesaian', judul: 'Penyelesaian', grad: 'from-orange-400 to-rose-500',    aksen: 'bg-orange-500',  tint: 'bg-orange-50/60',  ket: 'Acara lewat, belum tuntas',        geser: false },
    { key: 'Done',         judul: 'Done',         grad: 'from-gray-300 to-gray-500',      aksen: 'bg-gray-400',    tint: 'bg-gray-50/60',    ket: 'Selesai (tampil 3 hari)',          geser: false },
];

/** Ringkas nilai kolom: 25.000.000 → 25 jt, 1.200.000.000 → 1,2 M */
const ringkasRupiah = (n) => {
    const v = Number(n || 0);
    if (v >= 1e9) return (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1).replace('.', ',') + ' M';
    if (v >= 1e6) return Math.round(v / 1e6) + ' jt';
    if (v >= 1e3) return Math.round(v / 1e3) + ' rb';
    return String(v);
};

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

    // Persetujuan penawaran oleh Manajemen.
    const [setujuiKartu, setSetujuiKartu] = useState(null);
    const [tolakKartu, setTolakKartu] = useState(null);
    const [catatanTolak, setCatatanTolak] = useState('');
    const [submitPenawaran, setSubmitPenawaran] = useState(false);

    const aksiPenawaran = (namaRute, kartu, data, tutup) => {
        if (submitPenawaran) return;
        setSubmitPenawaran(true);
        setError('');
        router.patch(route(namaRute, kartu.id_event), data, {
            preserveScroll: true,
            onSuccess: () => tutup(),
            onError: (err) => setError(Object.values(err)[0] || 'Gagal memproses penawaran.'),
            onFinish: () => setSubmitPenawaran(false),
        });
    };

    const setujuiPenawaran = () =>
        aksiPenawaran(routes.setujuiPenawaran, setujuiKartu, {}, () => setSetujuiKartu(null));

    const tolakPenawaran = () =>
        aksiPenawaran(routes.tolakPenawaran, tolakKartu, { catatan: catatanTolak }, () => setTolakKartu(null));

    const ajukanPenawaran = (kartu) =>
        aksiPenawaran(routes.ajukanPenawaran, kartu, {}, () => {});

    const [expandedCard, setExpandedCard] = useState(null);

    const semua = Object.values(kolom).flat();
    const total = semua.length;
    // Nilai event tertinggi & terendah (menggantikan total nilai papan).
    const nilaiList = semua.map((e) => Number(e.deal_harga_event || 0)).filter((v) => v > 0);
    const tertinggi = nilaiList.length ? Math.max(...nilaiList) : 0;
    const terendah  = nilaiList.length ? Math.min(...nilaiList) : 0;

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
                    {/* Nilai event tertinggi & terendah di pipeline */}
                    {tertinggi > 0 && (
                        <>
                            <span title="Nilai event tertinggi" className="px-3 py-1 text-xs font-bold border rounded-full text-emerald-700 bg-emerald-50 border-emerald-200">
                                ▲ Tertinggi Rp {ringkasRupiah(tertinggi)}
                            </span>
                            <span title="Nilai event terendah" className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-full">
                                ▼ Terendah Rp {ringkasRupiah(terendah)}
                            </span>
                        </>
                    )}

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
                        const nilai = kartu.reduce((s, e) => s + Number(e.deal_harga_event || 0), 0);
                        return (
                            <div
                                key={k.key}
                                onDragOver={(e) => { if (canEdit && k.geser) { e.preventDefault(); setHover(k.key); } }}
                                onDragLeave={() => setHover(null)}
                                onDrop={() => jatuhkan(k.key)}
                                className={`w-[252px] shrink-0 overflow-hidden rounded-2xl border transition-all ${
                                    aktif
                                        ? 'border-[#FF2D55] bg-pink-50/60 ring-2 ring-[#FF2D55]/25 shadow-lg scale-[1.01]'
                                        : 'border-gray-100 ' + k.tint
                                }`}
                            >
                                {/* Pita gradasi penanda tahap */}
                                <div className={`h-1.5 bg-gradient-to-r ${k.grad}`} />

                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h2 className="text-sm font-extrabold text-gray-900 truncate">{k.judul}</h2>
                                        <span className="px-2 py-0.5 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full shrink-0">
                                            {kartu.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <p className="text-[10px] leading-tight text-gray-400">{k.ket}</p>
                                        {/* Nilai kolom — berapa uang yang tertahan di tahap ini */}
                                        {nilai > 0 && (
                                            <span className="text-[10px] font-extrabold text-gray-600 whitespace-nowrap">
                                                Rp {ringkasRupiah(nilai)}
                                            </span>
                                        )}
                                    </div>

                                <div className="space-y-2 min-h-[5rem]">
                                    {kartu.length === 0 && (
                                        <div className="flex items-center justify-center text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg h-14">
                                            {aktif ? 'Lepas di sini' : 'Kosong'}
                                        </div>
                                    )}

                                    {kartu.map((e) => {
                                        const isOpen = expandedCard === e.id_event;
                                        return (
                                        <div
                                            key={e.id_event}
                                            draggable={canEdit && k.geser}
                                            onDragStart={() => { setDragId(e.id_event); setBaruDigeser(true); }}
                                            onDragEnd={() => {
                                                setDragId(null); setHover(null);
                                                setTimeout(() => setBaruDigeser(false), 100);
                                            }}
                                            onClick={() => { if (baruDigeser) return; setExpandedCard(isOpen ? null : e.id_event); }}
                                            title="Klik untuk lihat detail"
                                            className={`relative overflow-hidden p-2.5 pl-3 bg-white border rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md ${
                                                dragId === e.id_event ? 'opacity-40 rotate-1 border-gray-100' : isOpen ? 'border-gray-200 ring-1 ring-gray-200' : 'border-gray-100'
                                            }`}
                                        >
                                            <span className={`absolute inset-y-0 left-0 w-1 ${k.aksen}`} />

                                            {/* Header ringkas — selalu tampil */}
                                            <div className="flex items-start gap-1.5">
                                                {canEdit && k.geser && (
                                                    <GripVertical size={13} onClick={(ev) => ev.stopPropagation()}
                                                        className="mt-0.5 text-gray-300 shrink-0 cursor-grab active:cursor-grabbing"
                                                        title="Seret untuk memindahkan tahap" />
                                                )}
                                                <h3 className="flex-1 text-xs font-bold leading-snug text-gray-900 line-clamp-2">{e.nama_event}</h3>
                                                <ChevronDown size={14} className={`mt-0.5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <div className="flex items-center flex-wrap gap-1.5 min-w-0 text-[10px] text-gray-500">
                                                    {e.dari_planning && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 rounded">
                                                            <Lightbulb size={9} /> RENCANA
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                                        <CalendarDays size={10} className="shrink-0" /> {tanggal(e.tgl_mulai_event)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-extrabold text-[#FF2D55] whitespace-nowrap">{rupiah(e.deal_harga_event)}</p>
                                            </div>

                                            {/* Detail (dropdown) */}
                                            {isOpen && (
                                                <div className="pt-2 mt-2 border-t border-gray-100">
                                                    <div className="space-y-1 text-[10px] text-gray-500">
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
                                                        {e.pic?.nama_pegawai && (
                                                            <p className="flex items-center gap-1">
                                                                <User size={10} className="shrink-0" /> {e.pic.nama_pegawai}
                                                            </p>
                                                        )}
                                                        {(['Deal', 'Upcoming', 'Penyelesaian', 'Done'].includes(k.key) || e.respon_klien === 'Diterima') && (
                                                            <p className="flex items-center gap-1 font-bold text-emerald-700">
                                                                <Lock size={10} className="shrink-0" /> Penawaran diterima
                                                            </p>
                                                        )}
                                                        {/* Penawaran hanya sampai ke klien setelah disetujui Manajemen,
                                                            jadi tahapnya perlu terbaca langsung dari kartu. */}
                                                        {k.key === 'Negotiation' && e.penawaran_status === 'Diajukan' && (
                                                            <p className="flex items-center gap-1 font-bold text-amber-700">
                                                                <Clock size={10} className="shrink-0" /> Menunggu persetujuan Manajemen
                                                            </p>
                                                        )}
                                                        {k.key === 'Negotiation' && e.penawaran_status === 'Ditolak' && (
                                                            <p className="flex items-start gap-1 font-bold text-red-600">
                                                                <XCircle size={10} className="mt-0.5 shrink-0" />
                                                                <span>Ditolak Manajemen{e.penawaran_catatan ? `: ${e.penawaran_catatan}` : ''}</span>
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Aksi persetujuan penawaran. Manajemen memutuskan; Event
                                                        Marketing mengajukan ulang setelah memperbaiki. */}
                                                    {k.key === 'Negotiation' && (routes.setujuiPenawaran || routes.ajukanPenawaran) && (
                                                        <div className="flex flex-wrap gap-1 mt-2" onClick={(ev) => ev.stopPropagation()}>
                                                            {routes.setujuiPenawaran && e.penawaran_status === 'Diajukan' && (
                                                                <>
                                                                    <button type="button" onClick={() => setSetujuiKartu(e)}
                                                                        className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-white rounded bg-emerald-600 hover:bg-emerald-700">
                                                                        <CheckCircle2 size={10} /> Setujui penawaran
                                                                    </button>
                                                                    <button type="button" onClick={() => { setError(''); setCatatanTolak(''); setTolakKartu(e); }}
                                                                        className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-red-600 rounded bg-red-50 hover:bg-red-100">
                                                                        <XCircle size={10} /> Tolak
                                                                    </button>
                                                                </>
                                                            )}
                                                            {routes.ajukanPenawaran && e.penawaran_status !== 'Disetujui' && e.penawaran_status !== 'Diajukan' && (
                                                                <button type="button" onClick={() => ajukanPenawaran(e)}
                                                                    className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-white rounded bg-amber-600 hover:bg-amber-700">
                                                                    <Send size={10} /> Ajukan ke Manajemen
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

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
                                                                <span title="Nomor WhatsApp klien belum diisi" className="px-1.5 py-1 text-[9px] font-bold text-gray-400 rounded bg-gray-50">No. WA —</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-1 mt-2">
                                                        {routes.detail && (
                                                            <button type="button" onClick={(ev) => { ev.stopPropagation(); bukaEvent(e); }}
                                                                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-white rounded bg-[#FF2D55] hover:brightness-110">
                                                                <Eye size={10} /> Buka detail
                                                            </button>
                                                        )}
                                                        {canEdit && routes.batal && ['Lead', 'Negotiation', 'Deal'].includes(k.key) && !e.dari_planning && (
                                                            <button type="button"
                                                                onClick={(ev) => { ev.stopPropagation(); setError(''); setAlasan(''); setBatalKartu(e); }}
                                                                className="flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold text-rose-600 rounded bg-rose-50 hover:bg-rose-100">
                                                                <XCircle size={10} /> Tidak jadi
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
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
                                    <td colSpan={6} className="px-4 py-3 text-xs font-bold text-right text-gray-500">Nilai tertinggi &middot; terendah</td>
                                    <td className="px-4 py-3 text-sm font-extrabold text-right text-gray-900 whitespace-nowrap">
                                        {rupiah(tertinggi)} &middot; {rupiah(terendah)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {/* Menyetujui penawaran = mengirimkannya ke klien saat itu juga,
                jadi dikonfirmasi dulu agar tidak terkirim karena salah klik. */}
            {setujuiKartu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => !submitPenawaran && setSetujuiKartu(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-600" />
                                <h3 className="text-lg font-extrabold text-gray-900">Setujui penawaran</h3>
                            </div>
                            <button type="button" onClick={() => !submitPenawaran && setSetujuiKartu(null)}
                                className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="mt-3 text-sm text-gray-600">
                            Penawaran untuk <span className="font-bold text-gray-900">"{setujuiKartu.nama_event}"</span> senilai{' '}
                            <span className="font-bold text-gray-900">{rupiah(setujuiKartu.deal_harga_event)}</span> akan
                            <b> langsung dikirimkan ke klien</b> beserta dokumen PDF-nya, dan tampil di dashboard klien
                            untuk diterima atau ditolak.
                        </p>

                        {error && <p className="p-2 mt-3 text-xs font-bold text-red-600 rounded-lg bg-red-50">{error}</p>}

                        <div className="flex justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setSetujuiKartu(null)} disabled={submitPenawaran}
                                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-60">
                                Batal
                            </button>
                            <button type="button" onClick={setujuiPenawaran} disabled={submitPenawaran}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60">
                                {submitPenawaran ? 'Mengirim…' : 'Setujui & kirim'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tolakKartu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => !submitPenawaran && setTolakKartu(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <XCircle size={20} className="text-rose-600" />
                                <h3 className="text-lg font-extrabold text-gray-900">Tolak penawaran</h3>
                            </div>
                            <button type="button" onClick={() => !submitPenawaran && setTolakKartu(null)}
                                className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="mt-3 text-sm text-gray-600">
                            Penawaran <span className="font-bold text-gray-900">"{tolakKartu.nama_event}"</span> tidak
                            dikirimkan ke klien. Kartunya tetap di tahap Negotiation agar Event Marketing bisa
                            memperbaiki lalu mengajukannya kembali.
                        </p>

                        <label className="block mt-4 mb-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase">
                            Catatan perbaikan <span className="text-red-500">* wajib</span>
                        </label>
                        <textarea value={catatanTolak} onChange={(ev) => setCatatanTolak(ev.target.value)} rows={3} maxLength={500}
                            placeholder="Mis. harga di bawah margin minimum, jumlah pax belum sesuai kesepakatan…"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" />

                        {error && <p className="p-2 mt-3 text-xs font-bold text-red-600 rounded-lg bg-red-50">{error}</p>}

                        <div className="flex justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setTolakKartu(null)} disabled={submitPenawaran}
                                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-60">
                                Batal
                            </button>
                            <button type="button" onClick={tolakPenawaran} disabled={submitPenawaran || catatanTolak.trim().length < 5}
                                className="px-4 py-2 text-sm font-bold text-white rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50">
                                {submitPenawaran ? 'Menyimpan…' : 'Tolak penawaran'}
                            </button>
                        </div>
                    </div>
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
