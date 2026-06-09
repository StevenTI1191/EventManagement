import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { ChevronLeft, Calendar, Users, Wallet, Phone, Mail, Building, X } from 'lucide-react';
import { useState } from 'react';

export default function AppointmentShow({ appointment }) {
    const { flash } = usePage().props;
    const [showReschedule, setShowReschedule]     = useState(false);
    const [showBatal, setShowBatal]               = useState(false);
    const [showKonfirmModal, setShowKonfirmModal] = useState(false);
    const [showSelesaiModal, setShowSelesaiModal] = useState(false);
    const [konfirmLoading, setKonfirmLoading]     = useState(false);
    const [selesaiLoading, setSelesaiLoading]     = useState(false);

    // Reschedule form state
    const [rescheduleForm, setRescheduleForm] = useState({
        tgl_konfirmasi: appointment.tgl_request ?? '',
        jam_konfirmasi: appointment.jam_request ?? '',
        catatan_em: '',
    });
    const [rescheduleLoading, setRescheduleLoading] = useState(false);

    const batalForm = useForm({ catatan_em: '' });

    const formatTanggal = (tgl) => {
        if (!tgl) return '-';
        return new Date(tgl).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatBudget = (value) => {
        if (!value) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(value);
    };

    // Direct confirm — triggered from custom modal
    const handleKonfirmasiLangsung = () => {
        setShowKonfirmModal(false);
        setKonfirmLoading(true);
        router.patch(route('em.appointment.konfirmasi', appointment.id), {
            tgl_konfirmasi: appointment.tgl_request,
            jam_konfirmasi: appointment.jam_request ?? '',
            catatan_em:     '',
            is_reschedule:  false,
        }, {
            onFinish: () => setKonfirmLoading(false),
        });
    };

    // Reschedule — opens modal
    const handleReschedule = (e) => {
        e.preventDefault();
        if (!rescheduleForm.tgl_konfirmasi) return;
        setRescheduleLoading(true);
        router.patch(route('em.appointment.konfirmasi', appointment.id), {
            ...rescheduleForm,
            is_reschedule: true,
        }, {
            onSuccess: () => { setShowReschedule(false); },
            onFinish:  () => setRescheduleLoading(false),
        });
    };

    const handleBatal = (e) => {
        e.preventDefault();
        batalForm.patch(route('em.appointment.batal', appointment.id), {
            onSuccess: () => {
                setShowBatal(false);
                batalForm.reset();
            },
        });
    };

    const handleSelesai = () => {
        if (selesaiLoading) return;
        setSelesaiLoading(true);
        router.patch(route('em.appointment.selesai', appointment.id), {}, {
            onFinish: () => {
                setSelesaiLoading(false);
                setShowSelesaiModal(false);
            },
        });
    };

    const getStatusColor = (status) => {
        if (status === 'Dikonfirmasi') return 'bg-green-100 text-green-700';
        if (status === 'Pending')      return 'bg-yellow-100 text-yellow-700';
        if (status === 'Reschedule')   return 'bg-blue-100 text-blue-700';
        if (status === 'Selesai')      return 'bg-gray-100 text-gray-600';
        if (status === 'Dibatalkan')   return 'bg-red-100 text-red-600';
        return '';
    };

    const batalEmpty = !batalForm.data.catatan_em.trim() || batalForm.data.catatan_em.trim().length < 5;

    return (
        <EventMarketingLayout>
            <Head title="Detail Appointment" />

            <div className="mb-6">
                <Link href={route('em.appointment.index')}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#FF2D55] mb-4">
                    <ChevronLeft size={16} /> Kembali
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-gray-900">{appointment.jenis_event}</h1>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                    </span>
                </div>
            </div>

            {flash?.success && (
                <div className="p-4 mb-6 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl">
                    ✅ {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Info Client */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <h3 className="mb-4 font-extrabold text-gray-900">Info Client</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-red-50">
                                <Users size={14} className="text-[#FF2D55]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Nama</p>
                                <p className="text-sm font-bold text-gray-800">{appointment.client?.nama_client}</p>
                            </div>
                        </div>
                        {appointment.client?.perusahaan_client && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-red-50">
                                    <Building size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Perusahaan</p>
                                    <p className="text-sm font-bold text-gray-800">{appointment.client.perusahaan_client}</p>
                                </div>
                            </div>
                        )}
                        {appointment.client?.no_telp_client && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-red-50">
                                    <Phone size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">No HP</p>
                                    <p className="text-sm font-bold text-gray-800">{appointment.client.no_telp_client}</p>
                                </div>
                            </div>
                        )}
                        {appointment.client?.email_client && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-red-50">
                                    <Mail size={14} className="text-[#FF2D55]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-bold text-gray-800">{appointment.client.email_client}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Appointment */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <h3 className="mb-4 font-extrabold text-gray-900">Detail Appointment</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tanggal Request</p>
                                <p className="text-sm font-bold text-gray-800">{formatTanggal(appointment.tgl_request)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Jam Request</p>
                                <p className="text-sm font-bold text-gray-800">{appointment.jam_request || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Jumlah Tamu</p>
                                <p className="text-sm font-bold text-gray-800">{appointment.jumlah_tamu ? appointment.jumlah_tamu + ' orang' : '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Estimasi Budget</p>
                                <p className="text-sm font-bold text-gray-800">{formatBudget(appointment.estimasi_budget)}</p>
                            </div>
                        </div>
                        {appointment.deskripsi_event && (
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Deskripsi Event</p>
                                <p className="p-3 text-sm text-gray-700 bg-gray-50 rounded-xl">{appointment.deskripsi_event}</p>
                            </div>
                        )}
                    </div>

                    {/* Hasil Konfirmasi */}
                    {(appointment.tgl_konfirmasi || appointment.catatan_em) && (
                        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                            <h3 className="mb-4 font-extrabold text-gray-900">Hasil Konfirmasi</h3>
                            {appointment.tgl_konfirmasi && (
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tanggal Meeting</p>
                                        <p className="text-sm font-bold text-gray-800">{formatTanggal(appointment.tgl_konfirmasi)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Jam Meeting</p>
                                        <p className="text-sm font-bold text-gray-800">{appointment.jam_konfirmasi || '-'}</p>
                                    </div>
                                </div>
                            )}
                            {appointment.catatan_em && (
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Catatan</p>
                                    <p className="p-3 text-sm text-gray-700 bg-gray-50 rounded-xl">{appointment.catatan_em}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {appointment.status === 'Pending' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowKonfirmModal(true)}
                                disabled={konfirmLoading}
                                className="flex-1 py-3 bg-[#FF2D55] text-white font-bold rounded-xl hover:bg-[#e02249] transition-colors disabled:opacity-60"
                            >
                                {konfirmLoading ? 'Memproses...' : '✅ Konfirmasi Sesuai Jadwal'}
                            </button>
                            <button
                                onClick={() => {
                                    setRescheduleForm({
                                        tgl_konfirmasi: appointment.tgl_request ?? '',
                                        jam_konfirmasi: appointment.jam_request ?? '',
                                        catatan_em: '',
                                    });
                                    setShowReschedule(true);
                                }}
                                className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
                            >
                                🔄 Reschedule
                            </button>
                            <button
                                onClick={() => setShowBatal(true)}
                                className="flex-1 py-3 font-bold text-red-500 transition-colors border border-red-300 rounded-xl hover:bg-red-50"
                            >
                                ❌ Batalkan
                            </button>
                        </div>
                    )}
                    {appointment.status === 'Reschedule' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <span className="text-blue-500 text-sm">🔄</span>
                                <p className="text-xs text-blue-700 font-medium">Appointment ini sudah dijadwalkan ulang. Tandai selesai setelah meeting dilaksanakan.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => setShowSelesaiModal(true)}
                                    className="flex-1 py-3 font-bold text-white transition-colors bg-gray-800 rounded-xl hover:bg-gray-700">
                                    ✔️ Tandai Selesai
                                </button>
                                <button onClick={() => setShowBatal(true)}
                                    className="flex-1 py-3 font-bold text-red-500 transition-colors border border-red-300 rounded-xl hover:bg-red-50">
                                    ❌ Batalkan
                                </button>
                            </div>
                        </div>
                    )}
                    {appointment.status === 'Dikonfirmasi' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => setShowSelesaiModal(true)}
                                className="flex-1 py-3 font-bold text-white transition-colors bg-gray-800 rounded-xl hover:bg-gray-700">
                                ✔️ Tandai Selesai
                            </button>
                            <button onClick={() => setShowBatal(true)}
                                className="flex-1 py-3 font-bold text-red-500 transition-colors border border-red-300 rounded-xl hover:bg-red-50">
                                ❌ Batalkan
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Konfirmasi Sesuai Jadwal */}
            {showKonfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-green-50">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="mb-1 text-lg font-extrabold text-center text-gray-900">Konfirmasi Appointment</h2>
                        <p className="mb-4 text-sm text-center text-gray-400">
                            Konfirmasi sesuai jadwal yang diminta client?
                        </p>

                        {/* Detail jadwal */}
                        <div className="p-3 mb-5 rounded-xl bg-green-50 border border-green-100 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Tanggal</span>
                                <span className="text-sm font-bold text-gray-800">{formatTanggal(appointment.tgl_request)}</span>
                            </div>
                            {appointment.jam_request && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Jam</span>
                                    <span className="text-sm font-bold text-gray-800">{appointment.jam_request}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Client</span>
                                <span className="text-sm font-bold text-gray-800">{appointment.client?.nama_client}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowKonfirmModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleKonfirmasiLangsung}
                                className="flex-1 py-2.5 bg-[#FF2D55] text-white font-bold rounded-xl hover:bg-[#e02249] transition-colors"
                            >
                                Ya, Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reschedule */}
            {showReschedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-extrabold text-gray-900">🔄 Reschedule Meeting</h2>
                            <button onClick={() => setShowReschedule(false)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="mb-4 text-xs text-gray-400">
                            Ubah jadwal meeting dari permintaan client. Status akan berubah menjadi <span className="font-bold text-blue-500">Reschedule</span>.
                        </p>
                        <form onSubmit={handleReschedule} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-bold tracking-wider text-gray-500 uppercase">Tanggal Baru *</label>
                                <input
                                    type="date"
                                    value={rescheduleForm.tgl_konfirmasi}
                                    onChange={e => setRescheduleForm(prev => ({ ...prev, tgl_konfirmasi: e.target.value }))}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55]"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold tracking-wider text-gray-500 uppercase">Jam Baru</label>
                                <input
                                    type="time"
                                    value={rescheduleForm.jam_konfirmasi}
                                    onChange={e => setRescheduleForm(prev => ({ ...prev, jam_konfirmasi: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55]"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold tracking-wider text-gray-500 uppercase">Catatan untuk Client</label>
                                <textarea
                                    rows={3}
                                    value={rescheduleForm.catatan_em}
                                    onChange={e => setRescheduleForm(prev => ({ ...prev, catatan_em: e.target.value }))}
                                    placeholder="Contoh: Jadwal diubah karena ada acara internal, mohon maaf atas ketidaknyamanannya"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55] resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReschedule(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={rescheduleLoading || !rescheduleForm.tgl_konfirmasi}
                                    className="flex-1 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-60"
                                >
                                    {rescheduleLoading ? 'Menyimpan...' : 'Simpan Reschedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Batalkan */}
            {showBatal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-extrabold text-gray-900">Batalkan Appointment</h2>
                            <button onClick={() => setShowBatal(false)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleBatal} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    Alasan Pembatalan <span className="text-red-500 normal-case font-normal">* wajib isi</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={batalForm.data.catatan_em}
                                    onChange={e => batalForm.setData('catatan_em', e.target.value)}
                                    placeholder="Jelaskan alasan pembatalan (min. 5 karakter)..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55] resize-none"
                                />
                                {batalForm.data.catatan_em.trim().length > 0 && batalForm.data.catatan_em.trim().length < 5 && (
                                    <p className="mt-1 text-xs text-red-400">⚠ Minimal 5 karakter</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBatal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50"
                                >
                                    Kembali
                                </button>
                                <button
                                    type="submit"
                                    disabled={batalForm.processing || batalEmpty}
                                    className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {batalForm.processing ? 'Memproses...' : 'Batalkan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Tandai Selesai */}
            {showSelesaiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100">
                            <span className="text-3xl">✔️</span>
                        </div>
                        <h2 className="mb-1 text-lg font-extrabold text-center text-gray-900">Tandai Selesai</h2>
                        <p className="mb-5 text-sm text-center text-gray-400">
                            Konfirmasi bahwa appointment <span className="font-bold text-gray-700">{appointment.jenis_event}</span> sudah selesai dilaksanakan?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSelesaiModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSelesai}
                                disabled={selesaiLoading}
                                className="flex-1 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {selesaiLoading ? 'Memproses...' : 'Ya, Selesai'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EventMarketingLayout>
    );
}
