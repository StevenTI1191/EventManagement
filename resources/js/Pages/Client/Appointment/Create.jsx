import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Calendar, Clock, Users, Wallet, FileText, CheckCircle, LayoutDashboard, AlertTriangle, Phone } from 'lucide-react';
import KalenderKetersediaan from '@/Components/KalenderKetersediaan';
import { KATEGORI_EVENT as EVENT_TYPES } from '@/constants/kategori';

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
    // Slot yang bentrok dengan jadwal acara — ditandai terpisah agar labelnya jelas.
    const [eventSlots, setEventSlots]    = useState([]);
    const [slotLoading, setSlotLoading]  = useState(false);
    const [dateError, setDateError]      = useState('');

    const handleDateChange = (value) => {
        setData('tgl_request', value);
        setData('jam_request', '');   // reset jam saat tanggal berubah
        setBookedSlots([]);
        setEventSlots([]);
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
            .then(d => {
                setBookedSlots(d.booked || []);
                setEventSlots(d.eventBlocked || []);
            })
            .catch(() => { setBookedSlots([]); setEventSlots([]); })
            .finally(() => setSlotLoading(false));
    };

    const step = !data.jenis_event ? 0 : (!data.tgl_request ? 1 : 2);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.appointment.store'));
    };

    const inputClass = "w-full px-4 py-3 bg-surface border border-line rounded-xl text-ink text-sm focus:border-gold focus:outline-none placeholder-muted-2 transition-colors";
    const labelClass = "block text-xs font-bold text-muted uppercase tracking-wider mb-2";

    return (
        <>
            <Head title="Buat Appointment - Laksamana Muda" />
            <div className="min-h-screen bg-paper">

                {/* Navbar */}
                <nav className="sticky top-0 z-40 px-6 py-3 bg-surface/95 backdrop-blur-md border-b border-line">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">

                        {/* Left: Brand */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-surface border border-gold rounded-full">
                                <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-ink leading-none">
                                    Laksamana <span className="text-gold">Muda</span>
                                </span>
                                <p className="text-[10px] text-muted-2 leading-none mt-0.5">Buat Appointment</p>
                            </div>
                        </div>

                        {/* Right: Back */}
                        <Link href={route('client.dashboard')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted bg-paper border border-line rounded-xl hover:text-gold-dim hover:border-gold/40 hover:bg-gold-soft transition-all">
                            <LayoutDashboard size={13} />
                            Dashboard
                        </Link>

                    </div>
                </nav>

                <div className="max-w-3xl px-6 py-10 mx-auto">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-ink">
                            Buat <span className="text-gold">Appointment</span>
                        </h1>
                        <p className="mt-2 text-muted">Isi detail event Anda dan tim kami akan mengkonfirmasi jadwal meeting.</p>
                    </div>

                    {/* Banner: Profil belum lengkap (perusahaan / no HP) — BLOCKING */}
                    {missingProfile && (
                        <div className="flex items-start gap-3 p-4 mb-6 bg-danger-bg border border-danger/30 rounded-xl">
                            <Phone size={18} className="text-danger flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-danger">
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
                        <div className="flex items-start gap-3 p-4 mb-6 bg-gold-soft border border-gold-2 rounded-xl">
                            <AlertTriangle size={18} className="text-gold-dim flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-gold-dim">Ada appointment yang sedang diproses</p>
                                <p className="text-xs text-gold/70 mt-0.5 leading-relaxed">
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
                                    i < step ? 'bg-gold text-white' :
                                    i === step ? 'bg-gold-soft border-2 border-gold text-gold-dim' :
                                    'bg-paper text-muted-2'
                                }`}>
                                    {i < step ? <CheckCircle size={14}/> : i + 1}
                                </div>
                                <span className={`text-xs font-bold ${i <= step ? 'text-gold-dim' : 'text-muted-2'}`}>{s}</span>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-px w-8 mx-1 ${i < step ? 'bg-gold' : 'bg-gold-soft'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SECTION 1 - Jenis Event */}
                        <div className="p-6 bg-surface border border-line rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-ink">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-white bg-gold rounded-full">1</span>
                                Pilih Jenis Event
                            </h2>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {EVENT_TYPES.map(type => (
                                    <button key={type.value} type="button"
                                        onClick={() => setData('jenis_event', type.value)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            data.jenis_event === type.value
                                                ? 'bg-gold-soft border-gold ring-1 ring-gold'
                                                : 'bg-surface border-line hover:border-line'
                                        }`}>
                                        <div className="text-2xl mb-2">{type.icon}</div>
                                        <p className={`text-xs font-bold leading-tight ${data.jenis_event === type.value ? 'text-gold-dim' : 'text-ink'}`}>
                                            {type.value}
                                        </p>
                                        <p className="text-[10px] text-muted mt-0.5 leading-tight">{type.desc}</p>
                                    </button>
                                ))}
                            </div>
                            {errors.jenis_event && <p className="mt-2 text-xs text-danger">⚠ {errors.jenis_event}</p>}
                        </div>

                        {/* SECTION 2 - Detail Event */}
                        <div className="p-6 bg-surface border border-line rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-ink">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-white bg-gold rounded-full">2</span>
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
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-bold pointer-events-none">Rp</span>
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
                                            <p className="mt-1 text-[10px] text-muted-2">
                                                = Rp {new Intl.NumberFormat('id-ID').format(data.estimasi_budget)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3 - Jadwal */}
                        <div className="p-6 bg-surface border border-line rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-ink">
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-black text-white bg-gold rounded-full">3</span>
                                Jadwal Meeting yang Diinginkan
                            </h2>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className={labelClass}>
                                        <Calendar size={11} className="inline mr-1" />
                                        Pilih Tanggal *
                                    </label>
                                    <KalenderKetersediaan
                                        value={data.tgl_request}
                                        onChange={handleDateChange}
                                        totalSlot={slots.length}
                                    />
                                    {dateError && <p className="mt-1 text-xs text-danger">⚠ {dateError}</p>}
                                    {errors.tgl_request && <p className="mt-1 text-xs text-danger">⚠ {errors.tgl_request}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        <Clock size={11} className="inline mr-1" />
                                        Pilih Jam *
                                    </label>

                                    {! data.tgl_request ? (
                                        <div className="flex items-center justify-center h-32 text-xs border border-dashed border-line rounded-2xl text-muted-2">
                                            Pilih tanggal dulu di kalender
                                        </div>
                                    ) : slotLoading ? (
                                        <div className="flex items-center justify-center h-32 text-xs border border-line rounded-2xl text-muted">
                                            Memuat slot…
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                            {slots.map(s => {
                                                const taken     = bookedSlots.includes(s);
                                                const eventBlok = eventSlots.includes(s);
                                                const nonaktif  = taken || eventBlok;
                                                const aktif = data.jam_request === s;
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        disabled={nonaktif}
                                                        onClick={() => setData('jam_request', s)}
                                                        title={taken ? 'Sudah dipesan' : eventBlok ? 'Bertepatan dengan jadwal acara' : `Meeting ${s}`}
                                                        className={`py-2 text-xs font-bold border rounded-xl transition-all ${
                                                            aktif
                                                                ? 'bg-gold-grad text-white border-transparent shadow-gold'
                                                                : nonaktif
                                                                    ? 'bg-paper border-line text-muted-2 line-through cursor-not-allowed'
                                                                    : 'bg-surface border-line text-ink hover:border-gold-2'
                                                        }`}
                                                    >
                                                        {s}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <p className="mt-2 text-[10px] text-muted-2">Meeting 30 menit · Senin–Sabtu · slot tiap 1,5 jam (09:00–16:30). Slot yang bertepatan jadwal acara tidak tersedia.</p>
                                    {errors.jam_request && <p className="mt-1 text-xs text-danger">⚠ {errors.jam_request}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex items-start gap-3 p-4 bg-gold/5 border border-line rounded-xl">
                            <span className="text-gold flex-shrink-0 mt-0.5">📌</span>
                            <div>
                                <p className="text-sm font-bold text-gold-dim">Informasi</p>
                                <p className="mt-0.5 text-xs text-gold/60 leading-relaxed">
                                    Tim Event Marketing kami akan mengkonfirmasi jadwal meeting dalam <strong>1×24 jam</strong>.
                                    Jadwal final akan disesuaikan dengan ketersediaan tim kami.
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4 pb-8">
                            <Link href={route('client.dashboard')}
                                className="flex-1 py-3.5 text-sm font-bold text-center text-muted transition-colors border border-line rounded-xl hover:bg-paper">
                                Batal
                            </Link>
                            <button type="submit"
                                disabled={processing || !data.jenis_event || !data.tgl_request || !data.jam_request || !!dateError || missingProfile}
                                className="flex-1 py-3.5 font-black text-white transition-all bg-gold-grad shadow-gold rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">
                                {processing ? '⏳ Mengirim...' : '🚀 Kirim Appointment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
