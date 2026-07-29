import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import {
    MessagesSquare, Building2, UserRound, MapPin, Users, Clock, CalendarPlus,
    Inbox, X, Send, XCircle, CalendarCheck2,
} from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const badgeStatus = (s) => ({
    Diajukan:    'bg-amber-100 text-amber-700',
    Dijawab:     'bg-blue-100 text-blue-700',
    Dijadwalkan: 'bg-violet-100 text-violet-700',
    Selesai:     'bg-emerald-100 text-emerald-700',
    Ditutup:     'bg-gray-200 text-gray-600',
}[s] || 'bg-gray-100 text-gray-600');

const Rinci = ({ icon: Icon, children }) => (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon size={13} className="text-gray-400 shrink-0" /> {children}
    </span>
);

export default function NegosiasiIndex({ menunggu = [], usulan = [], riwayat = [], slots = [] }) {
    const { flash, errors = {} } = usePage().props;
    const [aksi, setAksi] = useState(null);       // { n, tipe: 'balas' | 'tutup' }
    const [balasan, setBalasan] = useState('');
    const [jadwalkan, setJadwalkan] = useState(false);
    const [tgl, setTgl] = useState('');
    const [jam, setJam] = useState(slots[0] || '');
    const [alasan, setAlasan] = useState('');
    const [proses, setProses] = useState(false);

    const bukaBalas = (n) => {
        setBalasan(''); setJadwalkan(!!n.minta_meeting); setTgl(''); setJam(slots[0] || '');
        setAksi({ n, tipe: 'balas' });
    };
    const bukaTutup = (n) => { setAlasan(''); setAksi({ n, tipe: 'tutup' }); };

    const kirim = () => {
        if (proses) return;
        const { n, tipe } = aksi;

        if (tipe === 'tutup') {
            if (alasan.trim().length < 5) return;
            setProses(true);
            router.patch(route('em.negosiasi.tutup', n.id), { alasan }, {
                preserveScroll: true,
                onSuccess: () => setAksi(null),
                onFinish: () => setProses(false),
            });
            return;
        }

        if (balasan.trim().length < 5) return;
        if (jadwalkan && (!tgl || !jam)) return;
        setProses(true);
        router.patch(route('em.negosiasi.balas', n.id), {
            balasan, jadwalkan, tgl_meeting: jadwalkan ? tgl : null, jam_meeting: jadwalkan ? jam : null,
        }, {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        });
    };

    return (
        <EventMarketingLayout>
            <Head title="Negosiasi Klien - Laksamana Muda" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <MessagesSquare size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Negosiasi Klien</h1>
                    {menunggu.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-black text-white bg-[#FF2D55] rounded-full">
                            {menunggu.length}
                        </span>
                    )}
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Permintaan penyesuaian penawaran yang diajukan klien sebelum ia menerimanya. Tanggapi
                    permintaannya, dan bila perlu tawarkan jadwal pertemuan untuk membahas lebih lanjut —
                    jadwal yang Anda pilih menunggu persetujuan klien sebelum menjadi appointment resmi.
                </p>

                {flash?.success && (
                    <div className="p-3 mb-4 text-sm font-medium text-green-700 border border-green-200 rounded-xl bg-green-50">{flash.success}</div>
                )}
                {(flash?.error || Object.keys(errors).length > 0) && (
                    <div className="p-3 mb-4 text-sm font-medium text-red-700 border border-red-200 rounded-xl bg-red-50">
                        {flash?.error && <p>{flash.error}</p>}
                        {Object.values(errors).map((m, i) => <p key={i}>{m}</p>)}
                    </div>
                )}

                <h2 className="mb-3 text-sm font-black tracking-wider text-gray-500 uppercase">Menunggu Tanggapan</h2>

                {menunggu.length === 0 ? (
                    <div className="py-14 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <Inbox size={38} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Tidak ada permintaan yang menunggu.</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Permintaan muncul di sini ketika klien meminta penyesuaian atas penawaran.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {menunggu.map((n) => (
                            <div key={n.id} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-base font-extrabold text-gray-900">{n.nama_event}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">tahap {n.status_event}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-[#FF2D55]">{rupiah(n.nilai)}</p>
                                        <p className="text-[11px] text-gray-400">nilai penawaran</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2">
                                    <Rinci icon={Building2}>{n.client || '—'}{n.client_pic ? ` (${n.client_pic})` : ''}</Rinci>
                                    <Rinci icon={UserRound}>PIC: {n.pic || '—'}</Rinci>
                                    <Rinci icon={MapPin}>{n.area || '—'}</Rinci>
                                    <Rinci icon={Users}>{n.pax ? `${n.pax} pax` : '— pax'}</Rinci>
                                    <Rinci icon={Clock}>
                                        Diajukan {n.diajukan_pada}
                                        {n.menunggu_sejak ? ` • menunggu ${n.menunggu_sejak}` : ''}
                                    </Rinci>
                                </div>

                                <div className="p-3 mt-4 border border-gray-100 rounded-xl bg-gray-50">
                                    <p className="text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1">Permintaan klien</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{n.pesan}</p>
                                    {n.minta_meeting && (
                                        <p className="flex items-center gap-1.5 mt-2 text-xs font-bold text-violet-700">
                                            <CalendarPlus size={13} /> Klien meminta dijadwalkan pertemuan
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button onClick={() => bukaBalas(n)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-[#FF2D55] rounded-xl hover:brightness-110">
                                        <Send size={14} /> Tanggapi
                                    </button>
                                    <button onClick={() => bukaTutup(n)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-gray-600 rounded-xl bg-gray-100 hover:bg-gray-200">
                                        <XCircle size={14} /> Tutup
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Klien menawar hari lain atas jadwal yang kita usulkan.
                    Keputusannya diambil di halaman Appointment, karena di sanalah
                    pemeriksaan slot dan konfirmasi jadwal berada. */}
                {usulan.length > 0 && (
                    <>
                        <h2 className="mt-10 mb-3 text-sm font-black tracking-wider uppercase text-violet-600">
                            Klien Mengusulkan Hari Lain ({usulan.length})
                        </h2>
                        <div className="space-y-3">
                            {usulan.map((n) => (
                                <div key={n.id} className="p-5 border shadow-sm bg-violet-50/60 border-violet-200 rounded-2xl">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-base font-extrabold text-gray-900">{n.nama_event}</p>
                                            <p className="text-[11px] text-gray-500">{n.client || '—'} • PIC {n.pic || '—'}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${badgeStatus(n.status)}`}>
                                            {n.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
                                        <div className="p-3 bg-white border border-gray-200 rounded-xl">
                                            <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase mb-1">Jadwal yang kita tawarkan</p>
                                            <p className="text-sm font-bold text-gray-700">
                                                {n.meeting ? `${n.meeting.tanggal} • ${n.meeting.jam}` : '—'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white border rounded-xl border-violet-300">
                                            <p className="text-[10px] font-black tracking-wider text-violet-500 uppercase mb-1">Usulan klien</p>
                                            <p className="text-sm font-black text-violet-700">
                                                {n.usulan_klien.tanggal} • {n.usulan_klien.jam}
                                            </p>
                                        </div>
                                    </div>

                                    {n.usulan_klien.catatan && (
                                        <p className="mt-3 text-xs italic text-gray-600">"{n.usulan_klien.catatan}"</p>
                                    )}

                                    <a href={route('em.appointment.index')}
                                        className="flex items-center justify-center w-full gap-1.5 px-3 py-2 mt-4 text-xs font-black text-white bg-violet-600 rounded-xl hover:brightness-110">
                                        <CalendarCheck2 size={14} /> Tinjau di halaman Appointment
                                    </a>
                                    <p className="mt-2 text-[11px] text-center text-gray-500">
                                        Setujui atau tolak usulannya di sana — jadwalnya diperiksa terhadap slot yang sudah terpakai.
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {riwayat.length > 0 && (
                    <>
                        <h2 className="mt-10 mb-3 text-sm font-black tracking-wider text-gray-500 uppercase">Riwayat Negosiasi</h2>
                        <div className="space-y-3">
                            {riwayat.map((n) => (
                                <div key={n.id} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-gray-900">{n.nama_event}</p>
                                            <p className="text-[11px] text-gray-400">{n.client || '—'} • diajukan {n.diajukan_pada}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${badgeStatus(n.status)}`}>
                                            {n.status}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-xs text-gray-600 whitespace-pre-line">
                                        <span className="font-bold text-gray-500">Klien: </span>{n.pesan}
                                    </p>
                                    {n.balasan && (
                                        <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">
                                            <span className="font-bold text-gray-500">Tim: </span>{n.balasan}
                                        </p>
                                    )}
                                    {n.meeting && (
                                        <p className="flex items-center gap-1.5 mt-2 text-xs font-bold text-violet-700">
                                            <CalendarCheck2 size={13} />
                                            Pertemuan {n.meeting.tanggal} pukul {n.meeting.jam} ({n.meeting.status})
                                        </p>
                                    )}
                                    <p className="mt-2 text-[11px] text-gray-400">
                                        Ditangani {n.ditangani_oleh || '—'} • {n.ditangani_pada || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'balas' ? 'Tanggapi permintaan klien' : 'Tutup permintaan'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="mb-3 text-sm text-gray-600"><b>{aksi.n.nama_event}</b> — {aksi.n.client}</p>

                        {aksi.tipe === 'balas' ? (
                            <>
                                <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">Tanggapan *</label>
                                <textarea rows={3} value={balasan} onChange={(e) => setBalasan(e.target.value)} autoFocus
                                    placeholder="Mis. harga dapat kami sesuaikan dengan mengurangi paket dekorasi…"
                                    className="w-full px-4 py-2.5 mb-1 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                                {balasan.trim().length > 0 && balasan.trim().length < 5 && (
                                    <p className="mb-2 text-xs font-semibold text-red-600">Tanggapan minimal 5 karakter.</p>
                                )}

                                <label className="flex items-center gap-2 mt-3 mb-2 cursor-pointer">
                                    <input type="checkbox" checked={jadwalkan} onChange={(e) => setJadwalkan(e.target.checked)}
                                        className="accent-[#FF2D55]" />
                                    <span className="text-xs font-bold text-gray-700">Tawarkan jadwal pertemuan untuk membahas</span>
                                </label>

                                {jadwalkan && (
                                    <div className="p-3 border border-gray-100 rounded-xl bg-gray-50">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Tanggal</label>
                                                <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-[#FF2D55] focus:outline-none" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Jam</label>
                                                <select value={jam} onChange={(e) => setJam(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-[#FF2D55] focus:outline-none">
                                                    {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-400">
                                            Senin–Sabtu. Slot yang bentrok dengan appointment lain atau jadwal acara akan ditolak sistem.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="mb-2 text-sm text-gray-600">
                                    Permintaan ditutup tanpa tanggapan lanjutan. Alasannya tercatat pada riwayat.
                                </p>
                                <textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus
                                    placeholder="Mis. klien sudah menyetujui lewat telepon…"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                                {alasan.trim().length > 0 && alasan.trim().length < 5 && (
                                    <p className="mt-1 text-xs font-semibold text-red-600">Alasan minimal 5 karakter.</p>
                                )}
                            </>
                        )}

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={kirim} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-black text-white bg-[#FF2D55] rounded-xl hover:brightness-110 disabled:opacity-50">
                                {proses ? 'Mengirim…' : aksi.tipe === 'balas' ? 'Kirim tanggapan' : 'Ya, tutup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EventMarketingLayout>
    );
}
