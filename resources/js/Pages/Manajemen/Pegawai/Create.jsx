import ManajemenLayout from '@/Layouts/ManajemenLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

export default function PegawaiCreate({ auth }) {
    const { data, setData, post, processing, errors } = useForm({
        nama_pegawai: '',
        jenis_pegawai: 'Internal',
        posisi_pegawai: '',
        no_hp_pegawai: '',
        email_pegawai: '',
        password_pegawai: '',
        gaji_pokok: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('manajemen.pegawai.store'));
    };

    const handleJenisChange = (e) => {
        setData({
            ...data,
            jenis_pegawai: e.target.value,
            posisi_pegawai: '',
        });
    };

    const inputClass = 'w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55]';
    const labelClass = 'block mb-1 text-sm font-bold text-gray-700';

    return (
        <ManajemenLayout>
            <Head title="Tambah Pegawai - Laksamana Muda" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Tambah Pegawai</h1>
                <div className="flex items-center gap-2 mt-2">
                    <Link
                        href={route('manajemen.pegawai.index')}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#FF2D55] rounded-full hover:bg-[#e02249] transition-colors"
                    >
                        <ChevronLeft size={12} />
                        Kembali
                    </Link>
                </div>
            </div>

            <div className="max-w-2xl p-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className={labelClass}>Nama Pegawai</label>
                        <input
                            type="text"
                            placeholder="Masukkan nama pegawai"
                            className={inputClass}
                            value={data.nama_pegawai}
                            onChange={e => setData('nama_pegawai', e.target.value)}
                        />
                        {errors.nama_pegawai && <p className="mt-1 text-xs text-red-500">{errors.nama_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Jenis Pegawai</label>
                        <select
                            className={inputClass}
                            value={data.jenis_pegawai}
                            onChange={handleJenisChange}
                        >
                            <option value="Internal">Internal</option>
                            <option value="Eksternal">Eksternal</option>
                        </select>
                        {errors.jenis_pegawai && <p className="mt-1 text-xs text-red-500">{errors.jenis_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Posisi / Jabatan</label>
                        {data.jenis_pegawai === 'Internal' ? (
                            <>
                                <select
                                    className={inputClass}
                                    value={data.posisi_pegawai}
                                    onChange={e => setData('posisi_pegawai', e.target.value)}
                                >
                                    <option value="">-- Pilih Posisi --</option>
                                    <option value="Manajemen">Manajemen</option>
                                    <option value="EventMarketing">Event Marketing</option>
                                    <option value="Finance">Finance</option>
                                </select>
                                {data.posisi_pegawai && (
                                    <p className="mt-1.5 text-xs text-gray-400">
                                        {data.posisi_pegawai === 'Manajemen' && '👔 Akses penuh ke semua fitur manajemen.'}
                                        {data.posisi_pegawai === 'EventMarketing' && '🎯 Akses ke fitur event dan pemasaran.'}
                                        {data.posisi_pegawai === 'Finance' && '💰 Akses ke fitur keuangan dan transaksi.'}
                                    </p>
                                )}
                            </>
                        ) : (
                            <input
                                type="text"
                                placeholder="Contoh: Fotografer, MC, Dekorasi"
                                className={inputClass}
                                value={data.posisi_pegawai}
                                onChange={e => setData('posisi_pegawai', e.target.value)}
                            />
                        )}
                        {errors.posisi_pegawai && <p className="mt-1 text-xs text-red-500">{errors.posisi_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>No HP</label>
                        <input
                            type="text"
                            placeholder="Contoh: 08123456789"
                            className={inputClass}
                            value={data.no_hp_pegawai}
                            onChange={e => setData('no_hp_pegawai', e.target.value)}
                        />
                        {errors.no_hp_pegawai && <p className="mt-1 text-xs text-red-500">{errors.no_hp_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            className={inputClass}
                            value={data.email_pegawai}
                            onChange={e => setData('email_pegawai', e.target.value)}
                        />
                        {errors.email_pegawai && <p className="mt-1 text-xs text-red-500">{errors.email_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Password</label>
                        <input
                            type="password"
                            placeholder="Minimal 8 karakter"
                            className={inputClass}
                            value={data.password_pegawai}
                            onChange={e => setData('password_pegawai', e.target.value)}
                        />
                        {errors.password_pegawai && <p className="mt-1 text-xs text-red-500">{errors.password_pegawai}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Gaji Pokok</label>
                        <div className="relative">
                            <span className="absolute text-sm font-semibold text-gray-400 -translate-y-1/2 left-3 top-1/2">Rp</span>
                            <input
                                type="number"
                                placeholder="0"
                                className={inputClass + ' pl-10'}
                                value={data.gaji_pokok}
                                onChange={e => setData('gaji_pokok', e.target.value)}
                            />
                        </div>
                        {errors.gaji_pokok && <p className="mt-1 text-xs text-red-500">{errors.gaji_pokok}</p>}
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Link
                            href={route('manajemen.pegawai.index')}
                            className="px-8 py-2.5 text-sm font-bold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-8 py-2.5 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-[#e02249] transition-colors disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </ManajemenLayout>
    );
}

