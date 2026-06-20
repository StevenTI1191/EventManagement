import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Calendar, Clock, Users, Wallet, FileText, CheckCircle, LayoutDashboard, AlertTriangle, Phone } from 'lucide-react';

const EVENT_TYPES = [
    { value: 'Corporate Event',  icon: '🏢', desc: 'Seminar, gathering, konferensi' },
    { value: 'Wedding & Gala',   icon: '💍', desc: 'Pernikahan & gala dinner' },
    { value: 'Music & Concert',  icon: '🎵', desc: 'Konser & pertunjukan musik' },
    { value: 'Exhibition',       icon: '🎪', desc: 'Pameran & expo' },
    { value: 'Sports Event',     icon: '🏆', desc: 'Turnamen & olahraga' },
    { value: 'Private Party',    icon: '🎉', desc: 'Ulang tahun & acara privat' },
    { value: 'Lainnya',          icon: '✨', desc: 'Jenis event lainnya' },
];

const STEPS = ['Jenis Event', 'Detail', 'Jadwal'];

export default function AppointmentCreate({ has_active_appointment, missing_phone, missing_company, slots = [] }) {
    const missingProfile = missing_phone || missing_company;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    const { data, setData, post, processing, errors } = useForm({
        jenis_event: '',
        deskripsi_event: '',
        jumlah_tamu: '',
        estimasi_budget: '',
        tgl_request: '',
        jam_request: '',
    });

    // Slot yang sudah dipesan pada tanggal terpilih (untuk dinonaktifkan di dropdown)
    const [bookedSlots, setBookedSlots] = useState([]);
    const [slotLoading, setSlotLoading]  = useState(false);
    const [dateError, setDateError]      = useState('');

    const handleDateChange = (value) => {
        setData('tgl_request', value);
        setData('jam_request', '');   // reset jam saat tanggal berubah
        setBookedSlots([]);
        setDateError('');
        if (!value) return;

        // Tolak hari Minggu (0 = Minggu)
        if (new Date(value + 'T00:00').getDay() === 0) {
            setDateError('Hari Minggu libur. Pilih hari Senin–Sabtu.');
            return;
        }

        setSlotLoading(true);
        fetch(`/appointment/slots?tgl=${value}`, { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(d => setBookedSlots(d.booked || []))
            .catch(() => setBookedSlots([]))
            .finally(() => setSlotLoading(false));
    };

    const step = !data.jenis_event ? 0 : (!data.tgl_request ? 1 : 2);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.appointment.store'));
    };

    const inputClass = "w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-yellow-500 focus:outline-none placeholder-gray-600 transition-colors";
    const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2";

    return (
        <>
            <Head title="Buat Appointment - Laksamana Muda" />
            <div className="min-h-screen bg-black">

                {/* Navbar */}
                <nav className="sticky top-0 z-40 px-6 py-3 bg-gray-900/95 backdrop-blur-md border-b border-yellow-500/20">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">

                        {/* Left: Brand */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-black border border-yellow-500 rounded-full">
                                <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white leading-none">
                                    Laksamana <span className="text-yellow-500">Muda</span>
                                </span>
                                <p className="text-[10px] text-gray-600 leading-none mt-0.5">Buat Appointment</p>
                            </div>
                        </div>

                        {/* Right: Back */}
                        <Link href={route('client.dashboard')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-800 border border-gray-700 rounded-xl hover:text-yellow-400 hover:border-yellow-500/40 hover:bg-yellow-500/10 transition-all">
                            <LayoutDashboard size={13} />
                            Dashboard
                        </Link>

                    </div>
                </nav>

                <div className="max-w-3xl px-6 py-10 mx-auto">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white">
                            Buat <span className="text-yellow-500">Appointment</span>
                        </h1>
                        <p className="mt-2 text-gray-400">Isi detail event Anda dan tim kami akan mengkonfirmasi jadwal meeting.</p>
                    </div>

                    {/* Banner: Profil belum lengkap (perusahaan / no HP) — BLOCKING */}
                    {missingProfile && (
                        <div className="flex items-start gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <Phone size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-red-400">
                                    {missing_phone && missing_company ? 'Nama perusahaan & nomor HP belum diisi'
                                        : missing_company ? 'Nama perusahaan belum diisi'
                                        : 'Nomor HP belum diisi'}
                                </p>
                                <p className="text-xs text-red-300/80 mt-0.5 leading-relaxed">
                                    Lengkapi profil Anda terlebih dahulu agar tim kami bisa memproses appointment.
                                </p>
                            </div>
                            <Link href={route('client.profile')}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/15 transition-colors whitespace-nowrap">
                                Lengkapi Profil →
                            </Link>
                        </div>
                    )}

                    {/* Banner: Sudah ada appointment aktif — WARNING */}
                    {has_active_appointment && !missingProfile && (
                        <div className="flex items-start gap-3 p-4 mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-yellow-400">Ada appointment yang sedang diproses</p>
                                <p className="text-xs text-yellow-300/70 mt-0.5 leading-relaxed">
                                    Anda sudah memiliki appointment aktif (Pending/Dikonfirmasi). Anda tetap bisa mengirim yang baru, tapi pastikan ini memang appointment berbeda.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mb-8">
                        {STEPS.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all ${
                                    i < step ? 'bg-yellow-500 text-black' :
                                    i === step ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400' :
                                    'bg-gray-800 text-gray-600'
                                }`}>
                                    {i < step ? <CheckCircle size={14}/> : i + 1}
                                </div>
                                <span className={`text-xs font-bold ${i <= step ? 'text-yellow-400' : 'text-gray-600'}`}>{s}</span>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-px w-8 mx-1 ${i < step ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SECTION 1 - Jenis Event */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-white">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-black bg-yellow-500 rounded-full">1</span>
                                Pilih Jenis Event
                            </h2>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {EVENT_TYPES.map(type => (
                                    <button key={type.value} type="button"
                                        onClick={() => setData('jenis_event', type.value)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            data.jenis_event === type.value
                                                ? 'bg-yellow-500/10 border-yellow-500 ring-1 ring-yellow-500'
                                                : 'bg-black border-gray-700 hover:border-gray-500'
                                        }`}>
                                        <div className="text-2xl mb-2">{type.icon}</div>
                                        <p className={`text-xs font-bold leading-tight ${data.jenis_event === type.value ? 'text-yellow-400' : 'text-white'}`}>
                                            {type.value}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{type.desc}</p>
                                    </button>
                                ))}
                            </div>
                            {errors.jenis_event && <p className="mt-2 text-xs text-red-400">⚠ {errors.jenis_event}</p>}
                        </div>

                        {/* SECTION 2 - Detail Event */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-white">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-black bg-yellow-500 rounded-full">2</span>
                                Detail Event
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>
                                        <FileText size={11} className="inline mr-1" />
                                        Deskripsi Event
                                    </label>
                                    <textarea rows={3} value={data.deskripsi_event}
                                        onChange={e => setData('deskripsi_event', e.target.value)}
                                        placeholder="Ceritakan konsep, tema, dan kebutuhan event Anda secara singkat..."
                                        className={inputClass + ' resize-none'} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>
                                            <Users size={11} className="inline mr-1" />
                                            Estimasi Jumlah Tamu
                                        </label>
                                        <input type="number" min="1" value={data.jumlah_tamu}
                                            onChange={e => setData('jumlah_tamu', e.target.value)}
                                            placeholder="Contoh: 200" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>
                                            <Wallet size={11} className="inline mr-1" />
                                            Estimasi Budget
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold pointer-events-none">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={data.estimasi_budget
                                                    ? new Intl.NumberFormat('id-ID').format(data.estimasi_budget)
                                                    : ''}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    setData('estimasi_budget', raw ? Number(raw) : '');
                                                }}
                                                placeholder="0"
                                                className={inputClass + ' pl-9'}
                                            />
                                        </div>
                                        {data.estimasi_budget > 0 && (
                                            <p className="mt-1 text-[10px] text-gray-600">
                                                = Rp {new Intl.NumberFormat('id-ID').format(data.estimasi_budget)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3 - Jadwal */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-white">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-black bg-yellow-500 rounded-full">3</span>
                                Jadwal Meeting yang Diinginkan
                            </h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className={labelClass}>
                                        <Calendar size={11} className="inline mr-1" />
                                        Tanggal *
                                    </label>
                                    <input type="date" value={data.tgl_request}
                                        min={minDate}
                                        onChange={e => handleDateChange(e.target.value)}
                                        onClick={e => e.target.showPicker?.()}
                                        className={inputClass + ' input-dark cursor-pointer'} />
                                    {dateError && <p className="mt-1 text-xs text-red-400">⚠ {dateError}</p>}
                                    {errors.tgl_request && <p className="mt-1 text-xs text-red-400">⚠ {errors.tgl_request}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        <Clock size={11} className="inline mr-1" />
                                        Jam Mulai *
                                    </label>
                                    <select value={data.jam_request}
                                        onChange={e => setData('jam_request', e.target.value)}
                                        disabled={!data.tgl_request || !!dateError || slotLoading}
                                        className={inputClass + ' cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'}>
                                        <option value="">
                                            {!data.tgl_request ? 'Pilih tanggal dulu'
                                                : slotLoading ? 'Memuat slot...'
                                                : '— Pilih jam —'}
                                        </option>
                                        {slots.map(s => {
                                            const taken = bookedSlots.includes(s);
                                            return (
                                                <option key={s} value={s} disabled={taken}>
                                                    {s} {taken ? '(sudah dipesan)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className="mt-1 text-[10px] text-gray-600">Meeting 30 menit · Senin–Sabtu 09:00–17:00</p>
                                    {errors.jam_request && <p className="mt-1 text-xs text-red-400">⚠ {errors.jam_request}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                            <span className="text-yellow-500 flex-shrink-0 mt-0.5">📌</span>
                            <div>
                                <p className="text-sm font-bold text-yellow-400">Informasi</p>
                                <p className="mt-0.5 text-xs text-yellow-300/60 leading-relaxed">
                                    Tim Event Marketing kami akan mengkonfirmasi jadwal meeting dalam <strong>1×24 jam</strong>.
                                    Jadwal final akan disesuaikan dengan ketersediaan tim kami.
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4 pb-8">
                            <Link href={route('client.dashboard')}
                                className="flex-1 py-3.5 text-sm font-bold text-center text-gray-400 transition-colors border border-gray-700 rounded-xl hover:bg-gray-800">
                                Batal
                            </Link>
                            <button type="submit"
                                disabled={processing || !data.jenis_event || !data.tgl_request || !data.jam_request || !!dateError || missingProfile}
                                className="flex-1 py-3.5 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed">
                                {processing ? '⏳ Mengirim...' : '🚀 Kirim Appointment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
