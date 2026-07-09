import { Head, useForm, Link } from '@inertiajs/react';
import { ListChecks, Check } from 'lucide-react';
import RupiahInput from '@/Components/RupiahInput';

const EVENT_CATEGORIES = ['Konser', 'Wedding', 'Corporate', 'Birthday', 'Seminar', 'Lainnya'];

export default function PlanningCreate({ Layout, categories = [], submitRoute, indexRoute, event = null }) {
    const isEdit = !!event;
    const { data, setData, post, put, processing, errors, setError } = useForm({
        nama_event: event?.nama_event || '',
        kategori_event: event?.kategori_event || '',
        deskripsi_event: event?.deskripsi_event || '',
        tgl_mulai_event: event?.tgl_mulai_event ? String(event.tgl_mulai_event).slice(0, 10) : '',
        target_pax: event?.target_pax ?? '',
        target_omset: event?.target_omset ?? '',
        categories: categories.map((c) => c.name), // default: semua kategori dipilih (mode buat)
    });

    const toggleCat = (name) => {
        setData('categories', data.categories.includes(name)
            ? data.categories.filter((c) => c !== name)
            : [...data.categories, name]);
    };
    const allChecked = data.categories.length === categories.length;
    const setAll = (on) => setData('categories', on ? categories.map((c) => c.name) : []);

    const submit = (e) => {
        e.preventDefault();
        let bad = false;
        if (!data.nama_event.trim()) { setError('nama_event', 'Nama Event wajib diisi.'); bad = true; }
        if (!data.tgl_mulai_event) { setError('tgl_mulai_event', 'Tanggal Acara wajib diisi.'); bad = true; }
        if (bad) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        if (isEdit) put(route(submitRoute, event.id_event));
        else post(route(submitRoute));
    };

    return (
        <Layout>
            <Head title={`${isEdit ? 'Edit' : 'Tambah'} Event Planning — Laksamana Muda`} />

            <div className="mb-8">
                <div className="flex items-center gap-2">
                    <ListChecks size={24} className="text-[#FF2D55]" />
                    <h1 className="text-3xl font-extrabold text-gray-900">{isEdit ? 'Edit Event Planning' : 'Tambah Event Planning'}</h1>
                </div>
                <p className="mt-1 font-medium text-gray-500">
                    {isEdit
                        ? 'Perbarui data event Planning. To-do list yang sudah dibuat tidak akan berubah.'
                        : 'Isi data ringkas lalu pilih kategori to-do. Item persiapan akan dibuat otomatis sesuai kategori yang dipilih.'}
                </p>
            </div>

            <form onSubmit={submit} className="max-w-3xl bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-gray-100">
                {Object.keys(errors).length > 0 && (
                    <div className="flex items-start gap-3 p-4 mb-6 border border-red-200 bg-red-50 rounded-2xl">
                        <span className="text-lg leading-none">⚠️</span>
                        <ul className="mt-0.5 text-xs text-red-500 list-disc list-inside space-y-0.5">
                            {Object.values(errors).map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="block mb-1 text-sm font-bold text-gray-700">Nama Event</label>
                        <input type="text" placeholder="Silahkan Input Nama Event"
                            className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                            value={data.nama_event} onChange={(e) => setData('nama_event', e.target.value)} />
                        {errors.nama_event && <span className="text-xs text-red-500">{errors.nama_event}</span>}
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Kategori Event</label>
                            <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                value={data.kategori_event} onChange={(e) => setData('kategori_event', e.target.value)}>
                                <option value="">Pilih Kategori</option>
                                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Tanggal Acara</label>
                            <input type="date" className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                value={data.tgl_mulai_event} onChange={(e) => setData('tgl_mulai_event', e.target.value)} />
                            {errors.tgl_mulai_event && <span className="text-xs text-red-500">{errors.tgl_mulai_event}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Target Pax</label>
                            <input type="number" min="0" placeholder="Silahkan Input Target Pax"
                                className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                value={data.target_pax} onChange={(e) => setData('target_pax', e.target.value)} />
                            {errors.target_pax && <span className="text-xs text-red-500">{errors.target_pax}</span>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Target Omset</label>
                            <RupiahInput placeholder="Silahkan Input Target Omset"
                                className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                value={data.target_omset} onChange={(v) => setData('target_omset', v)} />
                            {errors.target_omset && <span className="text-xs text-red-500">{errors.target_omset}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-bold text-gray-700">Deskripsi Event</label>
                        <textarea placeholder="Silahkan Input Deskripsi Event"
                            className="w-full h-24 p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                            value={data.deskripsi_event} onChange={(e) => setData('deskripsi_event', e.target.value)} />
                    </div>

                    {/* Pilihan kategori to-do (hanya saat buat baru) */}
                    {!isEdit && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-gray-700">Kategori To-Do yang Dibuat</label>
                            <button type="button" onClick={() => setAll(!allChecked)}
                                className="text-xs font-bold text-[#FF2D55] hover:underline">
                                {allChecked ? 'Kosongkan semua' : 'Pilih semua'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {categories.map((c) => {
                                const on = data.categories.includes(c.name);
                                return (
                                    <button type="button" key={c.name} onClick={() => toggleCat(c.name)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${on ? 'border-[#FF2D55] bg-pink-50/60' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 ${on ? 'bg-[#FF2D55] border-[#FF2D55] text-white' : 'border-gray-300'}`}>
                                            {on && <Check size={12} strokeWidth={3} />}
                                        </span>
                                        <span className="flex-1 text-sm font-semibold text-gray-700">{c.name}</span>
                                        {c.count > 0 && <span className="text-[10px] font-bold text-gray-400">{c.count} item</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-xs text-gray-400">Kategori yang dicentang akan otomatis terisi item to-do standar. Bisa diubah lagi di board.</p>
                    </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-10">
                    <Link href={route(indexRoute)} className="px-8 py-3 font-bold text-gray-600 transition-all border border-gray-300 rounded-full hover:bg-gray-50">
                        Batal
                    </Link>
                    <button type="submit" disabled={processing}
                        className="px-10 py-3 bg-[#FF2D55] text-white rounded-full font-bold shadow-lg shadow-red-200 hover:bg-[#e02249] transition-all disabled:opacity-60">
                        {processing ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : 'Buat & Isi To-Do')}
                    </button>
                </div>
            </form>
        </Layout>
    );
}
