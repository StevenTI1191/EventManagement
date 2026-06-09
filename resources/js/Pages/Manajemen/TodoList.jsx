import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, Check } from 'lucide-react';

export default function TodoList({ event, tugas }) {
    const [adding, setAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteTugasId, setDeleteTugasId] = useState(null);
    const [form, setForm] = useState({
        nama_tugas: '', deskripsi_tugas: '', catatan_tugas: '', deadline_tugas: ''
    });

    const formatTgl = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const statusColor = (status) => {
        if (status === 'Done') return 'bg-green-100 text-green-700';
        return 'bg-orange-100 text-orange-700';
    };

    const handleAdd = () => {
        if (!form.nama_tugas || submitting) return;
        setSubmitting(true);
        router.post(route('manajemen.todo.store', event.id_event), form, {
            onSuccess: () => {
                setForm({ nama_tugas: '', deskripsi_tugas: '', catatan_tugas: '', deadline_tugas: '' });
                setAdding(false);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    const handleStatus = (t) => {
        const newStatus = t.status_tugas === 'Done' ? 'Ongoing' : 'Done';
        router.put(route('manajemen.todo.update', t.id_tugas), {
            ...t,
            status_tugas: newStatus,
        }, { preserveScroll: true });
    };

    const handleDelete = (id_tugas) => setDeleteTugasId(id_tugas);
    const confirmDelete = () => {
        if (deleting) return;
        setDeleting(true);
        router.delete(route('manajemen.todo.destroy', deleteTugasId), {
            preserveScroll: true,
            onFinish: () => { setDeleteTugasId(null); setDeleting(false); },
        });
    };

    const handleInlineUpdate = (t, field, value) => {
        router.put(route('manajemen.todo.update', t.id_tugas), {
            ...t,
            [field]: value,
        }, { preserveScroll: true });
    };

    return (
        <ManajemenLayout>
            <Head title={`To-Do List - ${event.nama_event}`} />
            <div className="max-w-5xl p-6">

                {/* Header */}
                <div className="mb-8">
                    <Link href={route('manajemen.event.index')}
                        className="inline-flex items-center gap-1 mb-4 text-sm text-gray-400 hover:text-gray-600">
                        <ChevronLeft size={16} /> Kembali ke Event
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900">To-Do List</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-[#FF2D55]" />
                        <p className="font-medium text-gray-500">{event.nama_event}</p>
                        {event.kategori_event && (
                            <span className="px-2 py-0.5 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                {event.kategori_event}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabel Tugas */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-6">
                    {/* Header tabel */}
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-bold tracking-widest text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                        <div className="col-span-3">Nama Tugas</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Deadline</div>
                        <div className="col-span-3">Catatan</div>
                        <div className="col-span-2"></div>
                    </div>

                    {tugas.length === 0 && !adding && (
                        <div className="py-16 text-center text-gray-400">
                            <p className="font-bold">Belum ada tugas. Klik "Add Task" untuk menambah.</p>
                        </div>
                    )}

                    {tugas.map(t => (
                        <div key={t.id_tugas} className="grid items-center grid-cols-12 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 group">
                            {/* Nama Tugas */}
                            <div className="flex items-center col-span-3 gap-3">
                                <button
                                    onClick={() => handleStatus(t)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                                        ${t.status_tugas === 'Done'
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-gray-300 hover:border-green-400'}`}
                                >
                                    {t.status_tugas === 'Done' && <Check size={12} strokeWidth={3} />}
                                </button>
                                <span className={`text-sm font-semibold ${t.status_tugas === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {t.nama_tugas}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <select
                                    value={t.status_tugas}
                                    onChange={e => handleInlineUpdate(t, 'status_tugas', e.target.value)}
                                    className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${statusColor(t.status_tugas)}`}
                                >
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>

                            {/* Deadline */}
                            <div className="col-span-2">
                                <input
                                    type="date"
                                    value={t.deadline_tugas || ''}
                                    onChange={e => handleInlineUpdate(t, 'deadline_tugas', e.target.value)}
                                    className="w-full p-0 text-xs text-gray-500 bg-transparent border-none cursor-pointer focus:ring-0"
                                />
                            </div>

                            {/* Catatan */}
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    defaultValue={t.catatan_tugas || ''}
                                    onBlur={e => handleInlineUpdate(t, 'catatan_tugas', e.target.value)}
                                    placeholder="Tambah catatan..."
                                    className="w-full px-2 py-1 text-xs text-gray-500 bg-transparent border-none rounded-lg focus:ring-1 focus:ring-gray-200"
                                />
                            </div>

                            {/* Delete */}
                            <div className="flex justify-end col-span-2 transition-opacity opacity-0 group-hover:opacity-100">
                                <button onClick={() => handleDelete(t.id_tugas)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Form tambah */}
                    {adding && (
                        <div className="grid items-center grid-cols-12 gap-2 px-6 py-4 border-b border-blue-100 bg-blue-50/40">
                            <div className="col-span-3">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nama tugas..."
                                    value={form.nama_tugas}
                                    onChange={e => setForm({ ...form, nama_tugas: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-[#FF2D55] focus:border-[#FF2D55]"
                                />
                            </div>
                            <div className="col-span-2">
                                <span className="px-2 text-xs font-medium text-gray-400">Ongoing</span>
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="date"
                                    value={form.deadline_tugas}
                                    onChange={e => setForm({ ...form, deadline_tugas: e.target.value })}
                                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 focus:ring-[#FF2D55]"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    placeholder="Catatan..."
                                    value={form.catatan_tugas}
                                    onChange={e => setForm({ ...form, catatan_tugas: e.target.value })}
                                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 focus:ring-[#FF2D55]"
                                />
                            </div>
                            <div className="flex justify-end col-span-2 gap-2">
                                <button onClick={handleAdd} disabled={submitting}
                                    className="px-3 py-1.5 bg-[#FF2D55] text-white text-xs font-bold rounded-xl hover:bg-[#e02249] disabled:opacity-60">
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button onClick={() => setAdding(false)}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-200">
                                    Batal
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Catatan Section */}
                {tugas.some(t => t.catatan_tugas) && (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-6">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800">Catatan Tugas</h2>
                        </div>
                        <div className="grid grid-cols-3 px-6 py-3 text-xs font-bold tracking-widest text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                            <div>Nama Tugas</div>
                            <div>Deadline</div>
                            <div>Catatan</div>
                        </div>
                        {tugas.filter(t => t.catatan_tugas).map(t => (
                            <div key={t.id_tugas} className="grid grid-cols-3 px-6 py-3 text-sm border-b border-gray-50">
                                <div className="font-medium text-gray-700">{t.nama_tugas}</div>
                                <div className="text-gray-400">{formatTgl(t.deadline_tugas)}</div>
                                <div className="text-gray-600">{t.catatan_tugas}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Task Button */}
                <button
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#FF2D55] text-white font-bold rounded-2xl hover:bg-[#e02249] transition-colors shadow-lg shadow-[#FF2D55]/30"
                >
                    <Plus size={18} strokeWidth={3} />
                    Add Task
                </button>
            </div>
            {deleteTugasId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Tugas?</h2>
                        <p className="mb-5 text-sm text-center text-gray-400">Tugas yang dihapus tidak bisa dikembalikan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTugasId(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                                {deleting ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}

