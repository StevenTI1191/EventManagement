import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, useForm, Link } from '@inertiajs/react';

export default function EMEditClient({ auth, client }) {
    const { data, setData, put, processing, errors } = useForm({
        nama_client:       client.nama_client || '',
        perusahaan_client: client.perusahaan_client || '',
        no_telp_client:    client.no_telp_client || '',
        email_client:      client.email_client || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('em.client.update', client.id));
    };

    return (
        <EventMarketingLayout>
            <Head title="Edit Client - Laksamana Muda" />

            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">Edit Client</h1>
                    <p className="font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">

                        {/* --- KOLOM KIRI --- */}
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Nama Client</label>
                                <input
                                    type="text"
                                    placeholder="Silahkan Input Nama Client"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.nama_client}
                                    onChange={e => setData('nama_client', e.target.value)}
                                />
                                {errors.nama_client && <span className="text-xs text-red-500">{errors.nama_client}</span>}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Perusahaan</label>
                                <input
                                    type="text"
                                    placeholder="Silahkan Input Nama Perusahaan"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.perusahaan_client}
                                    onChange={e => setData('perusahaan_client', e.target.value)}
                                />
                                {errors.perusahaan_client && <span className="text-xs text-red-500">{errors.perusahaan_client}</span>}
                            </div>
                        </div>

                        {/* --- KOLOM KANAN --- */}
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">No Telepon</label>
                                <input
                                    type="text"
                                    placeholder="Silahkan Input No Telepon"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.no_telp_client}
                                    onChange={e => setData('no_telp_client', e.target.value)}
                                />
                                {errors.no_telp_client && <span className="text-xs text-red-500">{errors.no_telp_client}</span>}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-bold text-gray-700">Email</label>
                                <input
                                    type="email"
                                    placeholder="Silahkan Input Email"
                                    className="w-full p-3 border-gray-200 rounded-xl bg-gray-50"
                                    value={data.email_client}
                                    onChange={e => setData('email_client', e.target.value)}
                                />
                                {errors.email_client && <span className="text-xs text-red-500">{errors.email_client}</span>}
                            </div>
                        </div>
                    </div>

                    {/* --- BUTTONS --- */}
                    <div className="flex justify-end gap-4 mt-12">
                        <Link
                            href={route('em.client.index')}
                            className="px-10 py-3 font-bold text-gray-600 transition-all border border-gray-300 rounded-full hover:bg-gray-50"
                        >
                            Back
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-12 py-3 bg-[#FF2D55] text-white rounded-full font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
                        >
                            {processing ? 'Processing...' : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </EventMarketingLayout>
    );
}
