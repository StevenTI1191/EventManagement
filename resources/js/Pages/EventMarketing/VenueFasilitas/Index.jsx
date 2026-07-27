import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Building, Plus, Pencil, Trash2, X, Eye, EyeOff, ImageOff } from 'lucide-react';

/**
 * Fasilitas venue yang tampil di halaman depan klien. Isinya mengikuti bagian
 * "Fasilitas Venue" pada surat penawaran, tetapi dapat diubah sewaktu-waktu
 * tanpa menyentuh kode.
 */
export default function VenueFasilitasIndex({ fasilitas = [] }) {
    const { flash, errors = {} } = usePage().props;
    const [modal, setModal] = useState(null);   // null | 'baru' | objek fasilitas
    const [hapus, setHapus] = useState(null);
    const [preview, setPreview] = useState(null);

    const form = useForm({
        nama: '', spesifikasi: '', keterangan: '', urutan: '', aktif: true, foto: null,
    });

    const bukaBaru = () => {
        form.reset(); form.clearErrors();
        setPreview(null); setModal('baru');
    };

    const bukaEdit = (f) => {
        form.setData({
            nama: f.nama || '', spesifikasi: f.spesifikasi || '', keterangan: f.keterangan || '',
            urutan: f.urutan ?? '', aktif: !!f.aktif, foto: null,
        });
        form.clearErrors();
        setPreview(f.foto ? `/${f.foto}` : null);
        setModal(f);
    };

    const pilihFoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        form.setData('foto', file);
        setPreview(URL.createObjectURL(file));
    };

    const simpan = (e) => {
        e.preventDefault();
        const opsi = { forceFormData: true, preserveScroll: true, onSuccess: () => setModal(null) };
        // Rute update memakai POST karena unggahan berkas tidak terkirim lewat PUT.
        if (modal === 'baru') form.post(route('em.venue.store'), opsi);
        else form.post(route('em.venue.update', modal.id), opsi);
    };

    return (
        <EventMarketingLayout>
            <Head title="Fasilitas Venue - Laksamana Muda" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                        <Building size={22} className="text-[#FF2D55]" />
                        <h1 className="text-2xl font-extrabold text-gray-900">Fasilitas Venue</h1>
                    </div>
                    <button onClick={bukaBaru}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:brightness-110">
                        <Plus size={16} /> Tambah Fasilitas
                    </button>
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Daftar ini tampil di halaman depan klien sebagai gambaran fasilitas yang sudah tersedia di
                    tempat — panggung, videotron, sound &amp; lighting, area indoor, dan sebagainya. Urutkan sesuai
                    yang paling ingin ditonjolkan.
                </p>

                {flash?.success && (
                    <div className="p-3 mb-4 text-sm font-medium text-green-700 border border-green-200 rounded-xl bg-green-50">{flash.success}</div>
                )}
                {Object.keys(errors).length > 0 && (
                    <div className="p-3 mb-4 text-sm font-medium text-red-700 border border-red-200 rounded-xl bg-red-50">
                        {Object.values(errors).map((m, i) => <p key={i}>{m}</p>)}
                    </div>
                )}

                {fasilitas.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <ImageOff size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Belum ada fasilitas yang didaftarkan.</p>
                        <p className="mt-1 text-xs text-gray-400">Halaman depan klien belum menampilkan bagian fasilitas venue.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {fasilitas.map((f) => (
                            <div key={f.id} className={`overflow-hidden bg-white border shadow-sm rounded-2xl ${f.aktif ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                                <div className="relative bg-gray-100 aspect-video">
                                    {f.foto
                                        ? <img src={`/${f.foto}`} alt={f.nama} className="object-cover w-full h-full" />
                                        : <div className="flex items-center justify-center h-full text-gray-300"><ImageOff size={28} /></div>}
                                    <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${f.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {f.aktif ? <><Eye size={9} className="inline mb-0.5" /> Tampil</> : <><EyeOff size={9} className="inline mb-0.5" /> Disembunyikan</>}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <p className="font-extrabold text-gray-900">{f.nama}</p>
                                    {f.spesifikasi && <p className="text-xs font-bold text-[#FF2D55] mt-0.5">{f.spesifikasi}</p>}
                                    {f.keterangan && <p className="mt-1 text-xs text-gray-500">{f.keterangan}</p>}
                                    <div className="flex items-center gap-2 mt-3">
                                        <button onClick={() => bukaEdit(f)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100">
                                            <Pencil size={12} /> Ubah
                                        </button>
                                        <button onClick={() => setHapus(f)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 rounded-lg bg-red-50 hover:bg-red-100">
                                            <Trash2 size={12} /> Hapus
                                        </button>
                                        <span className="ml-auto text-[10px] text-gray-400">urutan {f.urutan}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => form.processing || setModal(null)}>
                    <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <h2 className="text-lg font-extrabold text-gray-900">
                                {modal === 'baru' ? 'Tambah Fasilitas Venue' : 'Ubah Fasilitas Venue'}
                            </h2>
                            <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <form onSubmit={simpan}>
                            <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">Nama fasilitas *</label>
                            <input type="text" value={form.data.nama} onChange={(e) => form.setData('nama', e.target.value)} required
                                placeholder="Mis. Panggung Utama"
                                className="w-full px-4 py-2.5 mb-3 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                            <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Spesifikasi <span className="font-normal normal-case text-gray-400">(opsional)</span>
                            </label>
                            <input type="text" value={form.data.spesifikasi} onChange={(e) => form.setData('spesifikasi', e.target.value)}
                                placeholder="Mis. 4,2 x 7,6 meter"
                                className="w-full px-4 py-2.5 mb-3 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                            <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Keterangan <span className="font-normal normal-case text-gray-400">(opsional)</span>
                            </label>
                            <textarea rows={2} value={form.data.keterangan} onChange={(e) => form.setData('keterangan', e.target.value)}
                                placeholder="Penjelasan singkat yang dibaca calon klien…"
                                className="w-full px-4 py-2.5 mb-3 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                            <div className="flex gap-3 mb-3">
                                <div className="flex-1">
                                    <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">Urutan</label>
                                    <input type="number" min={0} value={form.data.urutan} onChange={(e) => form.setData('urutan', e.target.value)}
                                        placeholder="otomatis"
                                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                                </div>
                                <label className="flex items-end gap-2 pb-3 cursor-pointer">
                                    <input type="checkbox" checked={form.data.aktif} onChange={(e) => form.setData('aktif', e.target.checked)}
                                        className="accent-[#FF2D55]" />
                                    <span className="text-xs font-bold text-gray-700">Tampilkan di halaman klien</span>
                                </label>
                            </div>

                            <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Foto {modal === 'baru' ? '*' : <span className="font-normal normal-case text-gray-400">(kosongkan bila tidak diganti)</span>}
                            </label>
                            <input type="file" accept="image/*" onChange={pilihFoto}
                                className="w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-2 file:text-xs file:font-bold file:border-0 file:rounded-lg file:bg-gray-100" />
                            {preview && (
                                <img src={preview} alt="Pratinjau" className="object-cover w-full mt-3 rounded-xl aspect-video" />
                            )}

                            <div className="flex gap-3 mt-5">
                                <button type="button" onClick={() => setModal(null)} disabled={form.processing}
                                    className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                    Kembali
                                </button>
                                <button type="submit" disabled={form.processing || !form.data.nama.trim()}
                                    className="flex-1 py-2.5 text-sm font-black text-white bg-[#FF2D55] rounded-xl hover:brightness-110 disabled:opacity-50">
                                    {form.processing ? 'Menyimpan…' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {hapus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setHapus(null)}>
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-extrabold text-gray-900">Hapus fasilitas</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            <b>{hapus.nama}</b> akan dihapus dari halaman depan klien beserta fotonya.
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setHapus(null)}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                                Kembali
                            </button>
                            <button onClick={() => router.delete(route('em.venue.destroy', hapus.id), {
                                preserveScroll: true, onFinish: () => setHapus(null),
                            })}
                                className="flex-1 py-2.5 text-sm font-black text-white bg-red-500 rounded-xl hover:bg-red-600">
                                Ya, hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EventMarketingLayout>
    );
}
