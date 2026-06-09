import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, useForm, Link } from '@inertiajs/react';

export default function Create({ auth, clients, pegawais }) {
    const { data, setData, post, processing, errors } = useForm({
        nama_event: '',
        jumlah_pax: '',
        deskripsi_event: '',
        deal_harga_event: '',
        id_client: '',
        kategori_event: '',
        id_pegawai: '',
        status_event: 'Pending',
        tgl_mulai_event: '',
        jam_mulai: '09:00',
        jam_selesai: '13:00',
        area_event: 'Lantai 1',
        entairtainment_event: '',
        food_beverage_event: '',
        technical_meeting: '',
        gladi_resik: '',
        note_event: '',
        jam_keluar_makanan: '',
        poster_event: null,
        kontrak_file: null,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('em.event.store'), {
            forceFormData: true,
        });
    };

    return (
        <EventMarketingLayout>
            <Head title="Form Event - Laksamana Muda" />

            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">Form Event</h1>
                    <p className="font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">

                        {/* --- KOLOM KIRI --- */}
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Nama Event</label>
                                <input type="text" placeholder="Silahkan Input Nama Event"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.nama_event} onChange={e => setData('nama_event', e.target.value)} />
                                {errors.nama_event && <span className="text-xs text-red-500">{errors.nama_event}</span>}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Kategori Event</label>
                                <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.kategori_event} onChange={e => setData('kategori_event', e.target.value)}>
                                    <option value="">Pilih Kategori</option>
                                    <option value="Konser">Konser</option>
                                    <option value="Wedding">Wedding</option>
                                    <option value="Corporate">Corporate</option>
                                    <option value="Birthday">Birthday</option>
                                    <option value="Seminar">Seminar</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Deskripsi Event</label>
                                <textarea placeholder="Silahkan Input Deskripsi Event"
                                    className="w-full h-20 p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.deskripsi_event} onChange={e => setData('deskripsi_event', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">Client</label>
                                    <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                        value={data.id_client} onChange={e => setData('id_client', e.target.value)}>
                                        <option value="">Select</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.nama_client}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">PIC Event</label>
                                    <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                        value={data.id_pegawai} onChange={e => setData('id_pegawai', e.target.value)}>
                                        <option value="">Select</option>
                                        {pegawais.map(p => <option key={p.id_pegawai} value={p.id_pegawai}>{p.nama_pegawai}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Tanggal Event</label>
                                <input type="date" className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.tgl_mulai_event} onChange={e => setData('tgl_mulai_event', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">Acara Mulai</label>
                                    <input type="time" className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                        value={data.jam_mulai} onChange={e => setData('jam_mulai', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">Acara Selesai</label>
                                    <input type="time" className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                        value={data.jam_selesai} onChange={e => setData('jam_selesai', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Entertainment</label>
                                <input type="text" placeholder="Silahkan Input Jenis Entertainment"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.entairtainment_event} onChange={e => setData('entairtainment_event', e.target.value)} />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Food & Beverage</label>
                                <input type="text" placeholder="Silahkan Input Jenis Food & Beverage"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.food_beverage_event} onChange={e => setData('food_beverage_event', e.target.value)} />
                            </div>
                        </div>

                        {/* --- KOLOM KANAN --- */}
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Jumlah Pax</label>
                                <input type="number" placeholder="Silahkan Input Jumlah Pax Event"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.jumlah_pax} onChange={e => setData('jumlah_pax', e.target.value)} />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Deal Total Harga</label>
                                <input type="number" min="0" step="1000"
                                    placeholder="Silahkan Input Deal Total"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.deal_harga_event} onChange={e => setData('deal_harga_event', e.target.value)} />
                                {errors.deal_harga_event && <span className="text-xs text-red-500">{errors.deal_harga_event}</span>}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Status Event</label>
                                <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.status_event} onChange={e => setData('status_event', e.target.value)}>
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Upload Poster (Opsional)</label>
                                <input type="file" accept="image/*"
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                    onChange={e => {
                                        if (e.target.files && e.target.files[0]) {
                                            setData('poster_event', e.target.files[0]);
                                        }
                                    }} />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">
                                    Upload Kontrak <span className="font-normal text-gray-400">(PDF / Word)</span>
                                </label>
                                <input type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                                    onChange={e => {
                                        if (e.target.files && e.target.files[0]) {
                                            setData('kontrak_file', e.target.files[0]);
                                        }
                                    }} />
                                {errors.kontrak_file && <span className="text-xs text-red-500">{errors.kontrak_file}</span>}
                                {data.kontrak_file && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        File dipilih: <span className="font-semibold text-gray-600">{data.kontrak_file.name}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Area Event</label>
                                <select className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.area_event} onChange={e => setData('area_event', e.target.value)}>
                                    <option value="Lantai 1">Lantai 1</option>
                                    <option value="Lantai 2">Lantai 2</option>
                                    <option value="Outdoor">Outdoor</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">Technical Meeting</label>
                                    <input type="datetime-local" className="w-full p-3 text-xs border-gray-200 rounded-xl bg-gray-50"
                                        value={data.technical_meeting} onChange={e => setData('technical_meeting', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-bold text-gray-700">Gladi Resik</label>
                                    <input type="datetime-local" className="w-full p-3 text-xs border-gray-200 rounded-xl bg-gray-50"
                                        value={data.gladi_resik} onChange={e => setData('gladi_resik', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Special Request / Note</label>
                                <input type="text" placeholder="Silahkan Input Catatan Tambahan"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.note_event} onChange={e => setData('note_event', e.target.value)} />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Jam Keluar Makanan</label>
                                <input type="time" className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.jam_keluar_makanan} onChange={e => setData('jam_keluar_makanan', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {errors.bentrok && (
                        <div className="flex items-start gap-3 p-4 mt-6 border border-red-200 bg-red-50 rounded-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF2D55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <div>
                                <p className="text-sm font-extrabold text-red-600 mb-0.5">Jadwal Bentrok!</p>
                                <p className="text-sm text-red-500">{errors.bentrok}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 mt-12">
                        <Link href={route('em.event.index')}
                            className="px-10 py-3 font-bold text-gray-600 transition-all border border-gray-300 rounded-full hover:bg-gray-50">
                            Back
                        </Link>
                        <button type="submit" disabled={processing}
                            className="px-12 py-3 bg-[#FF2D55] text-white rounded-full font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all">
                            {processing ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </EventMarketingLayout>
    );
}
