/**
 * Halaman detail appointment, dipakai Event Marketing & Manajemen.
 * Sebelumnya hanya EM yang punya — Manajemen tidak bisa membuka appointment
 * sama sekali. Nama rutenya dikirim controller agar satu komponen melayani
 * kedua peran.
 */
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { ChevronLeft, Calendar, Users, Wallet, Phone, Mail, Building, X } from 'lucide-react';
import { useState } from 'react';

export default function AppointmentShow({ Layout, routes = {},  appointment }) {
    const { flash, errors = {} } = usePage().props;
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

    // Catatan meeting internal (poin/hasil pembahasan)
    const catatanForm = useForm({ catatan_meeting: appointment.catatan_meeting ?? '' });
    const simpanCatatanMeeting = (e) => {
        e.preventDefault();
        catatanForm.patch(route(routes.catatanMeeting, appointment.id), { preserveScroll: true });
    };

    // Tolak usulan jadwal dari klien (jadwal semula tetap berlaku).
    //
    // Penegasannya memakai dialog sistem, bukan confirm() bawaan peramban.
    // Popup peramban tampil di luar rancangan halaman dan pada sebagian peramban
    // dapat dibungkam pengguna, sehingga penolakan yang dikabarkan ke klien bisa
    // terkirim tanpa penegasan sama sekali.
    const [tolakUsulanLoading, setTolakUsulanLoading] = useState(false);
    const [tolakUsulanModal, setTolakUsulanModal] = useState(false);
    const tolakUsulan = () => {
        router.patch(route(routes.tolakUsulan, appointment.id), {}, {
            preserveScroll: true,
            onStart: () => setTolakUsulanLoading(true),
            onSuccess: () => setTolakUsulanModal(false),
            onFinish: () => setTolakUsulanLoading(false),
        });
    };

    // Hapus appointment permanen — dijaga konfirmasi ketik "HAPUS".
    const [hapusModal, setHapusModal] = useState(false);
    const [hapusKonfirmasi, setHapusKonfirmasi] = useState('');
    const [hapusLoading, setHapusLoading] = useState(false);
    const submitHapus = () => {
        if (hapusLoading || hapusKonfirmasi !== 'HAPUS') return;
        setHapusLoading(true);
        router.delete(route(routes.hapus, appointment.id), {
            data: { konfirmasi: hapusKonfirmasi },
            onFinish: () => setHapusLoading(false),
        });
    };

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
        router.patch(route(routes.konfirmasi, appointment.id), {
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
        if (!rescheduleForm.tgl_konfirmasi || !rescheduleForm.jam_konfirmasi) return;
        setRescheduleLoading(true);
        router.patch(route(routes.konfirmasi, appointment.id), {
            ...rescheduleForm,
            is_reschedule: true,
        }, {
            onSuccess: () => { setShowReschedule(false); },
            onFinish:  () => setRescheduleLoading(false),
        });
    };

    const handleBatal = (e) => {
        e.preventDefault();
        batalForm.patch(route(routes.batal, appointment.id), {
            onSuccess: () => {
                setShowBatal(false);
                batalForm.reset();
            },
        });
    };

    const handleSelesai = () => {
        if (selesaiLoading) return;
        setSelesaiLoading(true);
        router.patch(route(routes.selesai, appointment.id), {}, {
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
        <Layout>
            <Head title="Detail Appointment" />

            <div className="mb-6">
                <Link href={route(routes.index)}
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

            {/* Galat wajib tampil: konfirmasi & reschedule kini memeriksa slot
                (hari kerja, jam kerja, bentrok appointment/acara), dan tanpa
                penampil ini penolakannya tak terlihat — tombolnya seolah mati. */}
            {(flash?.error || Object.keys(errors).length > 0) && (
                <div className="p-4 mb-6 text-sm font-bold text-red-700 border border-red-200 bg-red-50 rounded-xl">
                    {flash?.error && <p>⚠️ {flash.error}</p>}
                    {Object.values(errors).map((pesan, i) => (
                        <p key={i}>⚠️ {pesan}</p>
                    ))}
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

                    {/* Usulan jadwal dari klien (reschedule dua arah) */}
                    {appointment.usulan_tgl && ['Pending', 'Dikonfirmasi', 'Reschedule'].includes(appointment.status) && (
                        <div className="p-6 bg-amber-50 border border-amber-200 shadow-sm rounded-2xl">
                            <h3 className="mb-3 font-extrabold text-amber-900">🔄 Usulan Jadwal dari Klien</h3>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-[10px] text-amber-500 uppercase tracking-wider">Tanggal Usulan</p>
                                    <p className="text-sm font-bold text-amber-900">{formatTanggal(appointment.usulan_tgl)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-500 uppercase tracking-wider">Jam Usulan</p>
                                    <p className="text-sm font-bold text-amber-900">{String(appointment.usulan_jam || '').substring(0, 5) || '-'}</p>
                                </div>
                            </div>
                            {appointment.usulan_catatan && (
                                <p className="p-3 mb-3 text-sm italic text-amber-800 bg-amber-100/60 rounded-xl">"{appointment.usulan_catatan}"</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => {
                                        setRescheduleForm({
                                            tgl_konfirmasi: appointment.usulan_tgl,
                                            jam_konfirmasi: String(appointment.usulan_jam || '').substring(0, 5),
                                            catatan_em: '',
                                        });
                                        setShowReschedule(true);
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-white transition-colors bg-amber-500 rounded-xl hover:bg-amber-600"
                                >
                                    Terima &amp; jadwalkan usulan ini
                                </button>
                                <button
                                    onClick={() => setTolakUsulanModal(true)}
                                    disabled={tolakUsulanLoading}
                                    className="px-4 py-2 text-sm font-bold transition-colors bg-white border text-amber-700 border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-60"
                                >
                                    {tolakUsulanLoading ? 'Memproses…' : 'Tolak Usulan'}
                                </button>
                            </div>
                        </div>
                    )}

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

                    {/* Tautan ke event — Buat Event dari appointment, atau lihat event yang sudah dibuat.
                        Rute dijaga: bila peran ini tidak mengirim eventIndex, jangan panggil route(undefined). */}
                    {['Dikonfirmasi', 'Reschedule', 'Selesai'].includes(appointment.status) && (
                        appointment.event ? (routes.eventIndex && (
                            <Link href={route(routes.eventIndex)}
                                className="flex items-center gap-2 p-3 mt-3 text-sm transition-colors border border-gray-200 bg-gray-50 rounded-xl hover:border-gray-300">
                                <Calendar size={15} className="text-gray-500 shrink-0" />
                                <span className="text-gray-600">Event terhubung:</span>
                                <span className="font-bold text-gray-900 truncate">{appointment.event.nama_event}</span>
                                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 text-gray-600 shrink-0">{appointment.event.status_event}</span>
                            </Link>
                        )) : (appointment.status !== 'Selesai' && routes.buatEvent) ? (
                            <Link href={route(routes.buatEvent, { dari_appointment: appointment.id })}
                                className="flex items-center justify-center gap-2 w-full py-3 mt-3 font-bold text-[#FF2D55] transition-colors border border-[#FF2D55]/30 rounded-xl hover:bg-[#FF2D55]/5">
                                ➕ Buat Event dari Appointment
                            </Link>
                        ) : null
                    )}
                </div>
            </div>

            {/* Catatan hasil pertemuan. Ditampilkan pula kepada klien pada
                dashboardnya sebagai bagian keterbukaan hasil pembahasan, jadi
                labelnya harus menyatakan itu. Sebelumnya kolom ini ditandai
                "Internal, tidak tampil ke client" padahal isinya memang dibaca
                klien, sehingga tim menuliskan hal yang tidak semestinya dibaca
                klien ke dalamnya. */}
            {['Dikonfirmasi', 'Reschedule', 'Selesai'].includes(appointment.status) && (
                <div className="max-w-3xl p-6 mx-auto mt-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-gray-900">Catatan Meeting</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full">Dibaca klien</span>
                    </div>
                    <p className="mb-3 text-xs text-gray-500">
                        Poin hasil pembahasan saat meeting. <b className="text-amber-700">Isi kolom ini
                        ditampilkan kepada klien</b> pada dashboardnya sebagai Hasil Pertemuan, dan ikut
                        terbawa menjadi catatan acara bila event dibuat dari appointment ini. Jangan
                        menuliskan hal yang tidak boleh dibaca klien, misalnya batas anggarannya.
                    </p>
                    <form onSubmit={simpanCatatanMeeting}>
                        <textarea
                            value={catatanForm.data.catatan_meeting}
                            onChange={(e) => catatanForm.setData('catatan_meeting', e.target.value)}
                            rows={4} maxLength={5000}
                            placeholder="Mis. klien tertarik paket B, minta revisi dekorasi, budget fleksibel sampai 60jt, follow up minggu depan…"
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-3 mt-3">
                            {catatanForm.recentlySuccessful && <span className="text-xs font-bold text-green-600">✓ Tersimpan</span>}
                            <button type="submit" disabled={catatanForm.processing}
                                className="px-4 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-[#e02249] disabled:opacity-60">
                                {catatanForm.processing ? 'Menyimpan…' : 'Simpan Catatan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Hapus permanen — dijaga konfirmasi ketik "HAPUS" */}
            <div className="max-w-3xl p-6 mx-auto mt-6 bg-white border border-red-100 shadow-sm rounded-2xl">
                <h3 className="font-extrabold text-red-700">Hapus Appointment</h3>
                <p className="mt-1 mb-3 text-xs text-gray-500">
                    Menghapus appointment ini secara permanen dari sistem. Riwayatnya tidak dapat dikembalikan. Gunakan hanya bila appointment memang perlu dihilangkan, misalnya duplikat atau salah input.
                </p>
                <button onClick={() => { setHapusKonfirmasi(''); setHapusModal(true); }}
                    className="px-4 py-2 text-sm font-bold text-red-600 transition-colors border border-red-300 rounded-xl hover:bg-red-50">
                    Hapus Permanen
                </button>
            </div>

            {/* Modal konfirmasi ketat hapus appointment */}
            {tolakUsulanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => !tolakUsulanLoading && setTolakUsulanModal(false)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-extrabold text-gray-900">Tolak Usulan Jadwal Klien</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Jadwal meeting yang berlaku sekarang <b>tetap sama</b>, dan klien akan diberi tahu
                            bahwa usulannya tidak dapat dipenuhi.
                        </p>
                        {appointment.usulan_tgl && (
                            <p className="p-3 mt-3 text-xs rounded-xl bg-orange-50 text-orange-800">
                                Usulan klien: <b>{appointment.usulan_tgl}</b>
                                {appointment.usulan_jam ? <> pukul <b>{String(appointment.usulan_jam).slice(0, 5)}</b></> : null}
                            </p>
                        )}
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setTolakUsulanModal(false)} disabled={tolakUsulanLoading}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Batal
                            </button>
                            <button onClick={tolakUsulan} disabled={tolakUsulanLoading}
                                className="flex-1 py-2.5 text-sm font-black text-white bg-orange-600 rounded-xl hover:bg-orange-700 disabled:opacity-60">
                                {tolakUsulanLoading ? 'Memproses…' : 'Ya, tolak usulan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {hapusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => !hapusLoading && setHapusModal(false)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-extrabold text-red-700">Hapus Appointment Permanen</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Tindakan ini <b>tidak dapat dibatalkan</b>. Appointment <b>"{appointment.jenis_event}"</b> akan hilang dari sistem.
                        </p>
                        <label className="block mt-4 mb-1.5 text-xs font-bold tracking-wide text-gray-500 uppercase">
                            Ketik <span className="text-red-600">HAPUS</span> untuk mengonfirmasi
                        </label>
                        <input type="text" value={hapusKonfirmasi} onChange={(e) => setHapusKonfirmasi(e.target.value)}
                            placeholder="HAPUS"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setHapusModal(false)} disabled={hapusLoading}
                                className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Batal
                            </button>
                            <button onClick={submitHapus} disabled={hapusLoading || hapusKonfirmasi !== 'HAPUS'}
                                className="px-4 py-2 text-sm font-black text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                {hapusLoading ? 'Menghapus…' : 'Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <label className="block mb-1 text-xs font-bold tracking-wider text-gray-500 uppercase">Jam Baru *</label>
                                <input
                                    type="time"
                                    value={rescheduleForm.jam_konfirmasi}
                                    onChange={e => setRescheduleForm(prev => ({ ...prev, jam_konfirmasi: e.target.value }))}
                                    required
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
                                    disabled={rescheduleLoading || !rescheduleForm.tgl_konfirmasi || !rescheduleForm.jam_konfirmasi}
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
        </Layout>
    );
}
