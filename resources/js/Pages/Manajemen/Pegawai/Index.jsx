import ManajemenLayout from '@/Layouts/ManajemenLayout';
import Pagination from '@/Components/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, X, Phone, Mail, Briefcase, Calendar, Wallet } from 'lucide-react';
import { useState } from 'react';

export default function PegawaiIndex({ auth, internal, eksternal }) {
    const { flash } = usePage().props;
    const [noteModal, setNoteModal]         = useState(null);
    const [deletePegawai, setDeletePegawai] = useState(null);
    const [deleting, setDeleting]           = useState(false);
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [viewModal, setViewModal] = useState(null);

    const handleDelete = (pegawai) => setDeletePegawai(pegawai);
    const confirmDeletePegawai = () => {
        if (deleting) return;
        setDeleting(true);
        router.delete(route('manajemen.pegawai.destroy', deletePegawai.id_pegawai), {
            preserveScroll: true,
            onFinish: () => { setDeletePegawai(null); setDeleting(false); },
        });
    };

    const openNote = (pegawai) => {
        setNoteModal(pegawai);
        setNoteText(pegawai.note_pegawai || '');
    };

    const saveNote = () => {
        setSaving(true);
        router.patch(route('manajemen.pegawai.note', noteModal.id_pegawai), {
            note_pegawai: noteText,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                setNoteModal(null);
            },
            onError: () => setSaving(false),
        });
    };

    const PegawaiCard = ({ pegawai }) => (
        <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-center flex-shrink-0 w-14 h-14 text-lg font-black rounded-full bg-red-50 text-[#FF2D55]">
                {pegawai.nama_pegawai.substring(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-extrabold text-gray-800 truncate">{pegawai.nama_pegawai}</p>
                        <p className="text-xs font-semibold text-[#FF2D55]">{pegawai.posisi_pegawai}</p>
                    </div>
                    <div className="flex items-center flex-shrink-0 gap-1">
                        <button
                            onClick={() => handleDelete(pegawai)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                        <Link
                            href={route('manajemen.pegawai.edit', pegawai.id_pegawai)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Pencil size={13} />
                        </Link>
                    </div>
                </div>

                <div className="mt-2 space-y-0.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Total Event Handle</span>
                        <span className="font-bold text-gray-700">: {pegawai.events_count ?? 0}</span>
                    </div>
                    {pegawai.jenis_pegawai === 'Eksternal' && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Re-hire</span>
                            <span className={'font-bold ' + (pegawai.rekomendasi_rehire === 'Yes' ? 'text-green-600' : 'text-red-500')}>
                                : {pegawai.rekomendasi_rehire === 'Yes' ? 'Recommended' : 'Not Recommended'}
                            </span>
                        </div>
                    )}
                    {pegawai.note_pegawai && (
                        <p className="mt-1 text-xs italic text-gray-400 line-clamp-1">
                            📝 {pegawai.note_pegawai}
                        </p>
                    )}
                    {(pegawai.posisi_pegawai === 'EventMarketing' || pegawai.posisi_pegawai === 'Event Marketing') && (
                        <Link
                            href={route('manajemen.evaluasi.pegawai', pegawai.id_pegawai)}
                            className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-[#FF2D55] hover:underline"
                        >
                            📊 Lihat closing rate di Evaluasi Kinerja →
                        </Link>
                    )}
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => setViewModal(pegawai)}
                        className="px-4 py-1 text-xs font-bold text-white bg-[#FF2D55] rounded-lg hover:bg-[#e02249] transition-colors"
                    >
                        View
                    </button>
                    <button
                        onClick={() => openNote(pegawai)}
                        className="px-4 py-1 text-xs font-bold text-gray-600 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                    >
                        Note {pegawai.note_pegawai ? '(edit)' : '+'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <ManajemenLayout>
            <Head title="Manajemen Pegawai - Laksamana Muda" />

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">List Pegawai</h1>
                <Link
                    href={route('manajemen.pegawai.create')}
                    className="flex items-center gap-2 px-5 py-2 bg-[#FF2D55] text-white text-sm font-bold rounded-xl hover:bg-[#e02249] transition-colors shadow-md shadow-[#FF2D55]/20"
                >
                    <Plus size={16} strokeWidth={3} />
                    Add Pegawai
                </Link>
            </div>

            {flash?.success && (
                <div className="p-4 mb-6 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">
                    ✅ {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="p-4 mb-6 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                    ⚠️ {flash.error}
                </div>
            )}

            <div className="mb-8">
                <p className="mb-4 text-sm font-bold tracking-widest text-gray-500 uppercase">Pegawai Internal</p>
                {internal.data?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {internal.data.map(pegawai => (
                            <PegawaiCard key={pegawai.id_pegawai} pegawai={pegawai} />
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-400">
                        <p className="font-bold">Belum ada pegawai internal.</p>
                    </div>
                )}
                <Pagination meta={internal} />
            </div>

            <div>
                <p className="mb-4 text-sm font-bold tracking-widest text-gray-500 uppercase">Pegawai Eksternal</p>
                {eksternal.data?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {eksternal.data.map(pegawai => (
                            <PegawaiCard key={pegawai.id_pegawai} pegawai={pegawai} />
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-400">
                        <p className="font-bold">Belum ada pegawai eksternal.</p>
                    </div>
                )}
                <Pagination meta={eksternal} />
            </div>

            {/* Modal View Detail */}
            {viewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden bg-white shadow-xl rounded-2xl">
                        {/* Header */}
                        <div className="relative p-6 bg-gradient-to-br from-[#FF2D55] to-[#FF5722]">
                            <button
                                onClick={() => setViewModal(null)}
                                className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-16 h-16 text-2xl font-black text-white rounded-full bg-white/20">
                                    {viewModal.nama_pegawai.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-white">{viewModal.nama_pegawai}</h2>
                                    <p className="text-sm text-white/80">{viewModal.posisi_pegawai}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-full">
                                        {viewModal.jenis_pegawai}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50">
                                    <Phone size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">No HP</p>
                                    <p className="text-sm font-bold text-gray-800">{viewModal.no_hp_pegawai}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50">
                                    <Mail size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-bold text-gray-800">{viewModal.email_pegawai}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50">
                                    <Briefcase size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Event</p>
                                    <p className="text-sm font-bold text-gray-800">{viewModal.events_count ?? 0} Event</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50">
                                    <Wallet size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Gaji Pokok</p>
                                    <p className="text-sm font-bold text-gray-800">
                                       {viewModal.gaji_pokok !== null && viewModal.gaji_pokok !== undefined
                                        ? 'Rp ' + Number(viewModal.gaji_pokok).toLocaleString('id-ID')
                                        : '-'}
                                    </p>
                                </div>
                            </div>

                            {viewModal.jenis_pegawai === 'Eksternal' && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50">
                                        <Calendar size={14} className="text-[#FF2D55]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Rekomendasi Re-hire</p>
                                        <p className={'text-sm font-bold ' + (viewModal.rekomendasi_rehire === 'Yes' ? 'text-green-600' : 'text-red-500')}>
                                            {viewModal.rekomendasi_rehire === 'Yes' ? '✅ Recommended' : '❌ Not Recommended'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {viewModal.note_pegawai && (
                                <div className="p-3 border border-gray-100 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">📝 Catatan</p>
                                    <p className="text-sm text-gray-700">{viewModal.note_pegawai}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 pb-6">
                            <Link
                                href={route('manajemen.evaluasi.pegawai', viewModal.id_pegawai)}
                                className="flex-1 py-2.5 text-sm font-bold text-center text-white bg-[#FF2D55] rounded-xl hover:bg-[#e02249] transition-colors"
                            >
                                Lihat Evaluasi
                            </Link>
                            <button
                                onClick={() => setViewModal(null)}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Note */}
            {noteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900">Catatan Pegawai</h2>
                                <p className="text-xs text-gray-400">{noteModal.nama_pegawai}</p>
                            </div>
                            <button
                                onClick={() => setNoteModal(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <textarea
                            rows={5}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Tulis catatan untuk pegawai ini..."
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-[#FF2D55] focus:border-[#FF2D55] resize-none"
                        />

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setNoteModal(null)}
                                className="px-5 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={saveNote}
                                disabled={saving}
                                className="px-5 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-[#e02249] disabled:opacity-60"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deletePegawai && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Pegawai?</h2>
                        <p className="mb-1 text-sm font-bold text-center text-gray-700">"{deletePegawai.nama_pegawai}"</p>
                        <p className="mb-5 text-xs text-center text-gray-400">Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletePegawai(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={confirmDeletePegawai} disabled={deleting}
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

