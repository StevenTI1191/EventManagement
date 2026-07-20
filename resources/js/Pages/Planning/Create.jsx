import { Head, useForm, Link } from '@inertiajs/react';
import { ListChecks, Check, Building2, Target } from 'lucide-react';
import RupiahInput from '@/Components/RupiahInput';
import SearchableSelect from '@/Components/SearchableSelect';
import TimePicker from '@/Components/TimePicker';

import { KATEGORI_VALUES as EVENT_CATEGORIES } from '@/constants/kategori';

const JENIS = [
    {
        key: 'internal',
        label: 'Event Internal',
        icon: Building2,
        ket: 'Acara milik LM sendiri. Tidak lewat pipeline — setelah difinalisasi langsung jadi Upcoming.',
    },
    {
        key: 'klien',
        label: 'Diajukan ke Klien',
        icon: Target,
        ket: 'Konsep untuk ditawarkan ke klien tertentu. Saat diajukan, masuk pipeline di kolom Lead.',
    },
];

export default function PlanningCreate({ Layout, categories = [], clients = [], submitRoute, indexRoute, event = null, jenisAwal = 'internal' }) {
    const isEdit = !!event;
    const { data, setData, post, put, processing, errors, setError } = useForm({
        nama_event: event?.nama_event || '',
        kategori_event: event?.kategori_event || '',
        deskripsi_event: event?.deskripsi_event || '',
        tgl_mulai_event: event?.tgl_mulai_event ? String(event.tgl_mulai_event).slice(0, 10) : '',
        // Tanggal selesai hanya terisi bila acaranya memang lebih dari sehari.
        multi_hari: !!event?.tgl_selesai_event,
        tgl_selesai_event: event?.tgl_selesai_event ? String(event.tgl_selesai_event).slice(0, 10) : '',
        jam_mulai: event?.jam_mulai ? String(event.jam_mulai).slice(0, 5) : '',
        jam_selesai: event?.jam_selesai ? String(event.jam_selesai).slice(0, 5) : '',
        area_event: event?.area_event || '',
        target_pax: event?.target_pax ?? '',
        target_omset: event?.target_omset ?? '',
        // Saat edit, jenis dibaca dari ada tidaknya klien sasaran.
        jenis: isEdit ? (event?.id_client ? 'klien' : 'internal') : jenisAwal,
        id_client: event?.id_client ? String(event.id_client) : '',
        categories: categories.map((c) => c.name), // default: semua kategori dipilih (mode buat)
    });

    const keKlien = data.jenis === 'klien';

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
        // Tanpa klien sasaran, rencana ini tidak akan pernah sampai ke pipeline.
        if (keKlien && !data.id_client) { setError('id_client', 'Pilih klien sasaran untuk rencana yang diajukan ke klien.'); bad = true; }
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

                    {/* Acara lebih dari sehari */}
                    <label className="flex items-start gap-3 p-4 transition-colors border cursor-pointer border-gray-200 rounded-2xl hover:border-gray-300 has-[:checked]:border-[#FF2D55] has-[:checked]:bg-[#FF2D55]/5">
                        <input type="checkbox" checked={data.multi_hari}
                            onChange={(e) => setData((d) => ({
                                ...d,
                                multi_hari: e.target.checked,
                                // Buang tanggal selesai bila dibatalkan, supaya tidak
                                // ada sisa tanggal yang ikut tersimpan diam-diam.
                                tgl_selesai_event: e.target.checked ? d.tgl_selesai_event : '',
                            }))}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF2D55] focus:ring-[#FF2D55]" />
                        <span>
                            <span className="block text-sm font-bold text-gray-800">Acara lebih dari satu hari</span>
                            <span className="block mt-0.5 text-xs text-gray-500">
                                Centang bila acara berlangsung beberapa hari berturut-turut, mis. festival tiga hari.
                            </span>
                        </span>
                    </label>

                    {data.multi_hari && (
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Tanggal Selesai</label>
                            <input type="date" min={data.tgl_mulai_event}
                                className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                value={data.tgl_selesai_event}
                                onChange={(e) => setData('tgl_selesai_event', e.target.value)} />
                            {errors.tgl_selesai_event && <span className="text-xs text-red-500">{errors.tgl_selesai_event}</span>}
                        </div>
                    )}

                    {/* Jam & tempat — boleh dikosongkan selama masih rencana,
                        tapi bila sudah pasti, acara bisa langsung difinalisasi
                        tanpa perlu dilengkapi lagi di halaman detail. */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">
                                Jam Mulai <span className="font-normal text-gray-400">(opsional)</span>
                            </label>
                            <TimePicker value={data.jam_mulai} onChange={(v) => setData('jam_mulai', v)} />
                            {errors.jam_mulai && <span className="text-xs text-red-500">{errors.jam_mulai}</span>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">
                                Jam Selesai <span className="font-normal text-gray-400">(opsional)</span>
                            </label>
                            <TimePicker value={data.jam_selesai} onChange={(v) => setData('jam_selesai', v)} />
                            {errors.jam_selesai && <span className="text-xs text-red-500">{errors.jam_selesai}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-bold text-gray-700">
                            Area / Tempat <span className="font-normal text-gray-400">(opsional)</span>
                        </label>
                        <input type="text" placeholder="mis. Ballroom Hotel Pangeran"
                            className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                            value={data.area_event} onChange={(e) => setData('area_event', e.target.value)} />
                        {errors.area_event && <span className="text-xs text-red-500">{errors.area_event}</span>}
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

                    {/* Jenis rencana — menentukan apakah nanti lewat pipeline atau tidak */}
                    <div>
                        <label className="block mb-2 text-sm font-bold text-gray-700">Jenis Rencana</label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {JENIS.map((j) => {
                                const on = data.jenis === j.key;
                                const Icon = j.icon;
                                return (
                                    <button type="button" key={j.key}
                                        onClick={() => {
                                            setData((d) => ({
                                                ...d,
                                                jenis: j.key,
                                                // Rencana internal tidak menyimpan klien sasaran.
                                                id_client: j.key === 'klien' ? d.id_client : '',
                                            }));
                                        }}
                                        className={`p-4 rounded-2xl border text-left transition-all ${
                                            on ? 'border-[#FF2D55] bg-pink-50/60 ring-1 ring-[#FF2D55]' : 'border-gray-200 hover:border-gray-300'
                                        }`}>
                                        <span className="flex items-center gap-2 mb-1">
                                            <Icon size={16} className={on ? 'text-[#FF2D55]' : 'text-gray-400'} />
                                            <span className="text-sm font-bold text-gray-800">{j.label}</span>
                                        </span>
                                        <span className="block text-xs leading-relaxed text-gray-500">{j.ket}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Klien sasaran — hanya relevan untuk rencana yang diajukan ke klien */}
                    {keKlien && (
                        <div>
                            <label className="block mb-1 text-sm font-bold text-gray-700">Klien Sasaran</label>
                            <SearchableSelect
                                options={clients.map((c) => ({
                                    value: c.id,
                                    label: c.nama_client + (c.perusahaan_client ? ` — ${c.perusahaan_client}` : ''),
                                    sub: c.sumber === 'Internal' ? 'Di-approach tim' : 'Daftar sendiri',
                                }))}
                                value={data.id_client}
                                onChange={(v) => setData('id_client', v)}
                                emptyOption="— Pilih klien sasaran —"
                                searchPlaceholder="Cari nama klien / perusahaan…"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Klien yang akan ditawari rencana ini — mis. konsep kontes gym untuk Alpha Fit Gym.
                            </p>
                            {errors.id_client && <span className="text-xs text-red-500">{errors.id_client}</span>}
                        </div>
                    )}

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
