import { Head, router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Check, Flag, ListChecks, Pencil } from 'lucide-react';

const CATEGORY_ORDER = [
    'Talent',
    'Legalitas',
    'Marketing',
    'Sosial Media & Designer',
    'Strategi Penjualan / Promo',
    'Ticketing & Registration',
    'F&B',
    'Finance',
    'Acara',
    'Operasional - Floor',
    'Operasional - Kasir',
    'Operasional - Lainnya',
];

const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, t) => s + (t.progress || 0), 0) / arr.length) : 0);

function groupItems(items) {
    const map = new Map();
    for (const t of items) {
        const key = t.kategori && String(t.kategori).trim() ? t.kategori : 'Tanpa Kategori';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    }
    const ordered = [];
    for (const c of CATEGORY_ORDER) {
        if (map.has(c)) { ordered.push([c, map.get(c)]); map.delete(c); }
    }
    const rest = [...map.keys()].filter((k) => k !== 'Tanpa Kategori').sort();
    for (const c of rest) ordered.push([c, map.get(c)]);
    if (map.has('Tanpa Kategori')) ordered.push(['Tanpa Kategori', map.get('Tanpa Kategori')]);
    return ordered;
}

function ProgressBar({ value }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const color = v >= 100 ? 'bg-green-500' : v > 0 ? 'bg-[#FF2D55]' : 'bg-gray-200';
    return (
        <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
            <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
        </div>
    );
}

export default function PlanningBoard({ Layout, event, tugas, pegawai, mode, routes }) {
    const [items, setItems] = useState(tugas || []);
    const [adding, setAdding] = useState({}); // { [kategori]: 'nama...' }
    const [newCat, setNewCat] = useState({ kategori: '', nama_tugas: '' });
    const [showNew, setShowNew] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [finalizing, setFinalizing] = useState(false);
    const [confirmFinalize, setConfirmFinalize] = useState(false);
    const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
    const [deletingEvent, setDeletingEvent] = useState(false);

    useEffect(() => { setItems(tugas || []); }, [tugas]);

    const isPlanning = mode === 'planning';
    const groups = groupItems(items);
    const overall = avg(items);

    const patchLocal = (id, patch) =>
        setItems((cur) => cur.map((t) => (t.id_tugas === id ? { ...t, ...patch } : t)));

    const commit = (id, payload) =>
        router.put(route(routes.update, id), payload, { preserveScroll: true, preserveState: true });

    const setField = (t, field, value) => { patchLocal(t.id_tugas, { [field]: value }); commit(t.id_tugas, { [field]: value }); };

    const setProgress = (t, value) => {
        const v = Math.max(0, Math.min(100, parseInt(value || 0, 10)));
        patchLocal(t.id_tugas, { progress: v, status_tugas: v >= 100 ? 'Done' : 'Ongoing' });
    };
    const commitProgress = (t) => commit(t.id_tugas, { progress: t.progress || 0 });

    const toggleDone = (t) => {
        const done = t.status_tugas !== 'Done';
        patchLocal(t.id_tugas, { status_tugas: done ? 'Done' : 'Ongoing', progress: done ? 100 : 0 });
        commit(t.id_tugas, { status_tugas: done ? 'Done' : 'Ongoing' });
    };

    const addItem = (kategori, nama) => {
        if (!nama || !nama.trim()) return;
        router.post(route(routes.store, event.id_event), { nama_tugas: nama.trim(), kategori: kategori || null }, {
            preserveScroll: true,
            onSuccess: () => { setAdding((a) => ({ ...a, [kategori || '__none']: '' })); setNewCat({ kategori: '', nama_tugas: '' }); setShowNew(false); },
        });
    };

    const doDelete = () => {
        if (!deleteId) return;
        router.delete(route(routes.destroy, deleteId), { preserveScroll: true, onFinish: () => setDeleteId(null) });
    };

    const doFinalize = () => {
        setFinalizing(true);
        router.patch(route(routes.finalize, event.id_event), {}, { onFinish: () => { setFinalizing(false); setConfirmFinalize(false); } });
    };

    const doDeleteEvent = () => {
        setDeletingEvent(true);
        router.delete(route(routes.eventDestroy, event.id_event), { onFinish: () => { setDeletingEvent(false); setConfirmDeleteEvent(false); } });
    };

    return (
        <Layout>
            <Head title={`${isPlanning ? 'Planning' : 'To-Do'} — ${event.nama_event}`} />

            {/* HEADER */}
            <div className="mb-6">
                <Link href={route(routes.back)} className="inline-flex items-center gap-1 mb-4 text-sm text-gray-400 hover:text-gray-600">
                    <ChevronLeft size={16} /> {isPlanning ? 'Kembali ke Planning' : 'Kembali ke Events'}
                </Link>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <ListChecks size={14} className="text-[#FF2D55]" />
                            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                                {isPlanning ? 'Planning Event' : 'To-Do List'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{event.nama_event}</h1>
                            {event.kategori_event && (
                                <span className="px-2 py-0.5 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                    {event.kategori_event}
                                </span>
                            )}
                        </div>
                    </div>
                    {isPlanning && (
                        <div className="flex flex-wrap items-center gap-2">
                            {routes.eventEdit && (
                                <Link href={route(routes.eventEdit, event.id_event)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50">
                                    <Pencil size={15} /> Edit
                                </Link>
                            )}
                            {routes.eventDestroy && (
                                <button onClick={() => setConfirmDeleteEvent(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50">
                                    <Trash2 size={15} /> Hapus
                                </button>
                            )}
                            {routes.finalize && (
                                <button onClick={() => setConfirmFinalize(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20">
                                    <Flag size={16} /> Finalisasi → Upcoming
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* OVERALL PROGRESS */}
                <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Progres Keseluruhan</span>
                            <span className="text-sm font-extrabold text-gray-800">{overall}%</span>
                        </div>
                        <ProgressBar value={overall} />
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-2xl font-extrabold text-gray-900">{items.filter((t) => t.status_tugas === 'Done').length}<span className="text-gray-300">/{items.length}</span></p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Item Selesai</p>
                    </div>
                </div>
            </div>

            {/* GROUPS */}
            <div className="space-y-5">
                {groups.map(([kategori, list]) => (
                    <div key={kategori} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                        {/* Category header */}
                        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                            <h2 className="font-extrabold text-gray-800">{kategori}</h2>
                            <span className="text-[11px] font-bold text-gray-400">{list.filter((t) => t.status_tugas === 'Done').length}/{list.length}</span>
                            <div className="flex-1 max-w-xs ml-auto"><ProgressBar value={avg(list)} /></div>
                            <span className="text-xs font-extrabold text-gray-700 w-9 text-right">{avg(list)}%</span>
                        </div>

                        {/* Column head */}
                        <div className="hidden md:grid grid-cols-24 gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100"
                            style={{ gridTemplateColumns: '1.5rem 1fr 4rem 8rem 7rem 1fr 8rem 2rem' }}>
                            <div></div><div>Item</div><div>Timeline</div><div>PIC</div><div>Deadline</div><div>Catatan</div><div>Progress</div><div></div>
                        </div>

                        {/* Items */}
                        {list.map((t) => (
                            <div key={t.id_tugas}
                                className="grid items-center gap-2 px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50/40 group"
                                style={{ gridTemplateColumns: '1.5rem 1fr 4rem 8rem 7rem 1fr 8rem 2rem' }}>
                                {/* done */}
                                <button onClick={() => toggleDone(t)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${t.status_tugas === 'Done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                                    {t.status_tugas === 'Done' && <Check size={11} strokeWidth={3} />}
                                </button>
                                {/* item name */}
                                <input value={t.nama_tugas || ''}
                                    onChange={(e) => patchLocal(t.id_tugas, { nama_tugas: e.target.value })}
                                    onBlur={(e) => commit(t.id_tugas, { nama_tugas: e.target.value })}
                                    className={`w-full bg-transparent border-none px-1 py-1 text-sm rounded focus:ring-1 focus:ring-gray-200 ${t.status_tugas === 'Done' ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`} />
                                {/* timeline */}
                                <input value={t.timeline || ''} placeholder="H-…"
                                    onChange={(e) => patchLocal(t.id_tugas, { timeline: e.target.value })}
                                    onBlur={(e) => commit(t.id_tugas, { timeline: e.target.value })}
                                    className="w-full px-1 py-1 text-xs text-center text-gray-500 bg-transparent border-none rounded focus:ring-1 focus:ring-gray-200" />
                                {/* PIC */}
                                <select value={t.id_pegawai || ''} onChange={(e) => setField(t, 'id_pegawai', e.target.value)}
                                    className="w-full px-2 py-1 text-xs text-gray-600 border border-gray-100 rounded-lg bg-gray-50 focus:ring-1 focus:ring-[#FF2D55] cursor-pointer">
                                    <option value="">—</option>
                                    {pegawai.map((p) => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                                </select>
                                {/* deadline */}
                                <input type="date" value={t.deadline_tugas ? String(t.deadline_tugas).slice(0, 10) : ''}
                                    onChange={(e) => setField(t, 'deadline_tugas', e.target.value)}
                                    className="w-full px-1 py-1 text-xs text-gray-500 bg-transparent border-none rounded cursor-pointer focus:ring-1 focus:ring-gray-200" />
                                {/* catatan */}
                                <input value={t.catatan_tugas || ''} placeholder="Catatan…"
                                    onChange={(e) => patchLocal(t.id_tugas, { catatan_tugas: e.target.value })}
                                    onBlur={(e) => commit(t.id_tugas, { catatan_tugas: e.target.value })}
                                    className="w-full px-1 py-1 text-xs text-gray-500 bg-transparent border-none rounded focus:ring-1 focus:ring-gray-200" />
                                {/* progress */}
                                <div className="flex items-center gap-2">
                                    <input type="range" min="0" max="100" step="5" value={t.progress || 0}
                                        onChange={(e) => setProgress(t, e.target.value)}
                                        onPointerUp={() => commitProgress(t)} onBlur={() => commitProgress(t)}
                                        className="w-full accent-[#FF2D55] cursor-pointer" />
                                    <span className="text-[11px] font-bold text-gray-500 w-8 text-right">{t.progress || 0}%</span>
                                </div>
                                {/* delete */}
                                <button onClick={() => setDeleteId(t.id_tugas)}
                                    className="justify-self-end p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        {/* add item to this category */}
                        <div className="px-5 py-2.5">
                            <AddItemInline
                                value={adding[kategori || '__none'] || ''}
                                onChange={(v) => setAdding((a) => ({ ...a, [kategori || '__none']: v }))}
                                onSubmit={() => addItem(kategori === 'Tanpa Kategori' ? '' : kategori, adding[kategori || '__none'])}
                            />
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="py-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                        <p className="font-bold">Belum ada item to-do.</p>
                        <p className="text-sm">Tambahkan item baru di bawah.</p>
                    </div>
                )}

                {/* add new item with category */}
                <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-4">
                    {showNew ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input list="cat-list" value={newCat.kategori} placeholder="Kategori (mis. Talent)"
                                onChange={(e) => setNewCat((c) => ({ ...c, kategori: e.target.value }))}
                                className="sm:w-56 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-[#FF2D55] focus:border-[#FF2D55]" />
                            <datalist id="cat-list">{CATEGORY_ORDER.map((c) => <option key={c} value={c} />)}</datalist>
                            <input value={newCat.nama_tugas} placeholder="Nama item…" autoFocus
                                onChange={(e) => setNewCat((c) => ({ ...c, nama_tugas: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && addItem(newCat.kategori, newCat.nama_tugas)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-[#FF2D55] focus:border-[#FF2D55]" />
                            <button onClick={() => addItem(newCat.kategori, newCat.nama_tugas)}
                                className="px-4 py-2 bg-[#FF2D55] text-white text-sm font-bold rounded-xl hover:bg-[#e02249]">Tambah</button>
                            <button onClick={() => setShowNew(false)}
                                className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowNew(true)}
                            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#FF2D55]">
                            <Plus size={16} strokeWidth={3} /> Tambah Item / Kategori
                        </button>
                    )}
                </div>
            </div>

            {/* delete modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Item?</h2>
                        <p className="mb-5 text-sm text-center text-gray-400">Item yang dihapus tidak bisa dikembalikan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Batal</button>
                            <button onClick={doDelete} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* finalize modal */}
            {confirmFinalize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-green-50">
                            <Flag size={20} className="text-green-600" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Finalisasi Event?</h2>
                        <p className="mb-5 text-sm text-center text-gray-400">Event akan berubah status menjadi <b>Upcoming</b> dan pindah ke menu Events. To-do list tetap berlanjut.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmFinalize(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Batal</button>
                            <button onClick={doFinalize} disabled={finalizing} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-60">
                                {finalizing ? 'Memproses…' : 'Ya, Finalisasi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* delete event modal */}
            {confirmDeleteEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Event Planning?</h2>
                        <p className="mb-5 text-sm text-center text-gray-400">Event <b>{event.nama_event}</b> beserta seluruh to-do list-nya akan dihapus permanen.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteEvent(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Batal</button>
                            <button onClick={doDeleteEvent} disabled={deletingEvent} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                                {deletingEvent ? 'Menghapus…' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

function AddItemInline({ value, onChange, onSubmit }) {
    return (
        <div className="flex items-center gap-2">
            <Plus size={14} className="text-gray-300" />
            <input value={value} placeholder="Tambah item…"
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
                className="flex-1 max-w-md px-2 py-1.5 text-sm bg-transparent border-none rounded-lg focus:ring-1 focus:ring-[#FF2D55]" />
            {value && value.trim() && (
                <button onClick={onSubmit} className="px-3 py-1 bg-[#FF2D55] text-white text-xs font-bold rounded-lg hover:bg-[#e02249]">Tambah</button>
            )}
        </div>
    );
}
