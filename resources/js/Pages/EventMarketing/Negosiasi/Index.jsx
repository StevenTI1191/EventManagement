import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import {
    MessagesSquare, Building2, UserRound, MapPin, Users, Clock, CalendarPlus,
    Inbox, X, Send, XCircle, CalendarCheck2, CheckCircle2, Hourglass, FileUp,
} from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const badgeStatus = (s) => ({
    Diajukan:    'bg-amber-100 text-amber-700',
    Dijawab:     'bg-blue-100 text-blue-700',
    Dijadwalkan: 'bg-violet-100 text-violet-700',
    UsulanKlien: 'bg-orange-100 text-orange-700',
    Selesai:     'bg-emerald-100 text-emerald-700',
    Ditutup:     'bg-gray-200 text-gray-600',
}[s] || 'bg-gray-100 text-gray-600');

const Rinci = ({ icon: Icon, children }) => (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon size={13} className="text-gray-400 shrink-0" /> {children}
    </span>
);

/**
 * Pemilih jadwal untuk tim: tanggal + jam BEBAS, disertai rentang jam yang
 * masih kosong pada tanggal itu. Berbeda dengan klien yang memilih dari slot
 * tetap — pembahasan penawaran justru perlu menyesuaikan waktu klien.
 */
const PilihJadwal = ({ tgl, setTgl, jam, setJam }) => {
    const [rentang, setRentang] = useState(null);
    const [muat, setMuat] = useState(false);

    useEffect(() => {
        if (!tgl) { setRentang(null); return; }
        let batal = false;
        setMuat(true);
        fetch(route('em.negosiasi.ketersediaan') + '?tgl=' + tgl, {
            headers: { Accept: 'application/json' }, credentials: 'same-origin',
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!batal) setRentang(d?.rentang ?? []); })
            .catch(() => { if (!batal) setRentang([]); })
            .finally(() => { if (!batal) setMuat(false); });
        return () => { batal = true; };
    }, [tgl]);

    return (
        <div className="p-3 border border-gray-100 rounded-xl bg-gray-50">
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Tanggal</label>
                    <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-[#FF2D55] focus:outline-none" />
                </div>
                <div className="w-32">
                    <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Jam</label>
                    <input type="time" value={jam} onChange={(e) => setJam(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-[#FF2D55] focus:outline-none" />
                </div>
            </div>

            {tgl && (
                <div className="mt-2 text-[11px]">
                    {muat ? (
                        <span className="text-gray-400">Memeriksa ketersediaan…</span>
                    ) : rentang && rentang.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-gray-500">Masih kosong:</span>
                            {rentang.map((r, i) => (
                                <button key={i} type="button" onClick={() => setJam(r.mulai)}
                                    className="px-2 py-0.5 font-bold rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100">
                                    {r.mulai}–{r.selesai}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="font-semibold text-red-600">
                            Tidak ada waktu kosong pada tanggal ini. Pilih tanggal lain.
                        </span>
                    )}
                </div>
            )}
            <p className="mt-1.5 text-[11px] text-gray-400">
                Senin–Sabtu, 09:00–17:00. Jam bebas — sistem menolak bila bertabrakan.
            </p>
        </div>
    );
};

export default function NegosiasiIndex({ menunggu = [], usulan = [], menungguKlien = [], riwayat = [] }) {
    const { flash, errors = {} } = usePage().props;

    const [aksi, setAksi] = useState(null);   // { n, tipe }
    const [balasan, setBalasan] = useState('');
    const [jadwalkan, setJadwalkan] = useState(false);
    const [tgl, setTgl] = useState('');
    const [jam, setJam] = useState('');
    const [alasan, setAlasan] = useState('');
    const [proses, setProses] = useState(false);

    const buka = (n, tipe, ikutJadwal = false) => {
        setBalasan(''); setAlasan(''); setTgl(''); setJam('');
        setJadwalkan(ikutJadwal);
        setAksi({ n, tipe });
    };

    const kirim = () => {
        if (proses) return;
        const { n, tipe } = aksi;
        const selesai = {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        };

        if (tipe === 'balas') {
            if (balasan.trim().length < 5) return;
            if (jadwalkan && (!tgl || !jam)) return;
            setProses(true);
            return router.patch(route('em.negosiasi.balas', n.id), {
                balasan, jadwalkan, tgl_meeting: jadwalkan ? tgl : null, jam_meeting: jadwalkan ? jam : null,
            }, selesai);
        }

        if (tipe === 'tolak-usulan') {
            if (alasan.trim().length < 5 || !tgl || !jam) return;
            setProses(true);
            return router.patch(route('em.negosiasi.tolak-usulan', n.id), {
                alasan, tgl_meeting: tgl, jam_meeting: jam,
            }, selesai);
        }

        if (tipe === 'tutup') {
            if (alasan.trim().length < 5) return;
            setProses(true);
            return router.patch(route('em.negosiasi.tutup', n.id), { alasan }, selesai);
        }

        // Rutenya milik pipeline, dan sasarannya acara — bukan negosiasinya.
        if (tipe === 'revisi') {
            setProses(true);
            return router.patch(route('em.penawaran.ajukan', n.id_event), {}, selesai);
        }
    };

    const terimaUsulan = (n) => {
        if (proses) return;
        setProses(true);
        router.patch(route('em.negosiasi.terima-usulan', n.id), {}, {
            preserveScroll: true, onFinish: () => setProses(false),
        });
    };

    /**
     * Penawaran kedua sesudah pembahasan dengan klien. Rutenya sama dengan yang
     * dipakai papan pipeline — di sini hanya disediakan pintunya, supaya tim
     * tidak perlu berpindah halaman tepat setelah menutup pembahasan.
     */
    const TombolRevisi = ({ n }) => n.boleh_revisi ? (
        <button onClick={() => buka(n, 'revisi')} disabled={proses}
            title="Ajukan penawaran revisi ke Manajemen setelah pembahasan dengan klien"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50">
            <FileUp size={14} /> Ajukan Revisi
        </button>
    ) : null;

    const Kepala = ({ n }) => (
        <>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-base font-extrabold text-gray-900">{n.nama_event}</p>
                    <p className="text-[11px] text-gray-500">{n.client || '—'} • PIC {n.pic || '—'}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-[#FF2D55]">{rupiah(n.nilai)}</p>
                    <p className="text-[11px] text-gray-400">nilai penawaran</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2">
                <Rinci icon={Building2}>{n.client_pic || '—'}</Rinci>
                <Rinci icon={MapPin}>{n.area || '—'}</Rinci>
                <Rinci icon={Users}>{n.pax ? `${n.pax} pax` : '— pax'}</Rinci>
                <Rinci icon={Clock}>Diajukan {n.diajukan_pada}</Rinci>
            </div>
        </>
    );

    return (
        <EventMarketingLayout>
            <Head title="Negosiasi Klien - Laksamana Muda" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <MessagesSquare size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Negosiasi Klien</h1>
                    {(menunggu.length + usulan.length) > 0 && (
                        <span className="px-2 py-0.5 text-xs font-black text-white bg-[#FF2D55] rounded-full">
                            {menunggu.length + usulan.length}
                        </span>
                    )}
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Permintaan penyesuaian penawaran beserta jadwal pembahasannya. Seluruh tawar-menawar
                    jadwal berlangsung di halaman ini — pembahasan penawaran tidak muncul di daftar
                    Appointment agar tidak ada dua tempat mengurus pertemuan yang sama.
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

                {/* ── 1. Permintaan baru ───────────────────────────────────── */}
                <h2 className="mb-3 text-sm font-black tracking-wider text-gray-500 uppercase">
                    Menunggu Tanggapan {menunggu.length > 0 && `(${menunggu.length})`}
                </h2>

                {menunggu.length === 0 ? (
                    <div className="py-10 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <Inbox size={34} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-bold text-gray-500">Tidak ada permintaan baru.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {menunggu.map((n) => (
                            <div key={n.id} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                                <Kepala n={n} />
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
                                    <button onClick={() => buka(n, 'balas', !!n.minta_meeting)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-[#FF2D55] rounded-xl hover:brightness-110">
                                        <Send size={14} /> Tanggapi
                                    </button>
                                    <button onClick={() => buka(n, 'tutup')}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-gray-600 rounded-xl bg-gray-100 hover:bg-gray-200">
                                        <XCircle size={14} /> Tutup
                                    </button>
                                    <TombolRevisi n={n} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── 2. Klien menawar jadwal lain ─────────────────────────── */}
                {usulan.length > 0 && (
                    <>
                        <h2 className="mt-10 mb-3 text-sm font-black tracking-wider uppercase text-orange-600">
                            Klien Mengusulkan Waktu Lain ({usulan.length})
                        </h2>
                        <div className="space-y-4">
                            {usulan.map((n) => (
                                <div key={n.id} className="p-5 border shadow-sm bg-orange-50/60 border-orange-200 rounded-2xl">
                                    <Kepala n={n} />

                                    <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
                                        <div className="p-3 bg-white border border-gray-200 rounded-xl">
                                            <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase mb-1">Tawaran kita</p>
                                            <p className="text-sm font-bold text-gray-700">
                                                {n.meeting ? `${n.meeting.tanggal} • ${n.meeting.jam}` : '—'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white border rounded-xl border-orange-300">
                                            <p className="text-[10px] font-black tracking-wider uppercase text-orange-500 mb-1">Usulan klien</p>
                                            <p className="text-sm font-black text-orange-700">
                                                {n.usulan_klien.tanggal} • {n.usulan_klien.jam}
                                            </p>
                                        </div>
                                    </div>

                                    {n.usulan_klien.catatan && (
                                        <p className="mt-3 text-xs italic text-gray-600">"{n.usulan_klien.catatan}"</p>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <button onClick={() => terimaUsulan(n)} disabled={proses}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50">
                                            <CheckCircle2 size={14} /> Terima usulan klien
                                        </button>
                                        <button onClick={() => buka(n, 'tolak-usulan')}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-orange-700 rounded-xl bg-orange-100 hover:bg-orange-200">
                                            <XCircle size={14} /> Tolak &amp; tawarkan waktu lain
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── 3. Menunggu klien ────────────────────────────────────── */}
                {menungguKlien.length > 0 && (
                    <>
                        <h2 className="mt-10 mb-3 text-sm font-black tracking-wider uppercase text-violet-600">
                            Menunggu Jawaban Klien ({menungguKlien.length})
                        </h2>
                        <div className="space-y-3">
                            {menungguKlien.map((n) => (
                                <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border shadow-sm border-violet-200 rounded-2xl">
                                    <div className="min-w-0">
                                        <p className="text-sm font-extrabold text-gray-900">{n.nama_event}</p>
                                        <p className="text-[11px] text-gray-500">{n.client || '—'}</p>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                                        <Hourglass size={13} />
                                        {n.meeting ? `${n.meeting.tanggal} • ${n.meeting.jam}` : 'jadwal belum ada'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── 4. Riwayat ───────────────────────────────────────────── */}
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
                                    {/* Pembahasan sudah tuntas — inilah saatnya penawaran
                                        keduanya diajukan, tanpa berpindah ke papan pipeline. */}
                                    {(n.boleh_revisi || n.menahan) && (
                                        <div className="pt-3 mt-3 border-t border-gray-100">
                                            {/* Selama pembahasan ini belum ditutup, klien TIDAK
                                                bisa menerima penawaran yang terpampang. Dua jalan
                                                keluarnya dinyatakan berdampingan: ajukan revisi
                                                (harga berubah), atau tutup (harga tetap). Tanpa
                                                salah satunya penawaran terkunci selamanya. */}
                                            {n.menahan && (
                                                <p className="p-2.5 mb-3 text-[11px] font-semibold leading-relaxed text-amber-800 border border-amber-200 rounded-xl bg-amber-50">
                                                    ⚠️ Klien belum dapat menerima penawaran selama pembahasan ini
                                                    terbuka. Ajukan penawaran revisi bila harganya berubah, atau
                                                    tutup pembahasan bila penawaran semula tetap berlaku.
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <TombolRevisi n={n} />
                                                {n.menahan && (
                                                    <button onClick={() => buka(n, 'tutup')}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                                                        <XCircle size={14} /> Tutup pembahasan
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ── Modal ────────────────────────────────────────────────────── */}
            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'balas' ? 'Tanggapi permintaan klien'
                                    : aksi.tipe === 'tolak-usulan' ? 'Tolak usulan & tawarkan waktu lain'
                                    : aksi.tipe === 'revisi' ? 'Ajukan penawaran revisi'
                                    : 'Tutup permintaan'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="mb-3 text-sm text-gray-600"><b>{aksi.n.nama_event}</b> — {aksi.n.client}</p>

                        {aksi.tipe === 'balas' && (
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
                                    <span className="text-xs font-bold text-gray-700">Tawarkan jadwal pertemuan</span>
                                </label>
                                {jadwalkan && <PilihJadwal tgl={tgl} setTgl={setTgl} jam={jam} setJam={setJam} />}
                            </>
                        )}

                        {aksi.tipe === 'tolak-usulan' && (
                            <>
                                <div className="p-3 mb-3 border rounded-xl border-orange-200 bg-orange-50">
                                    <p className="text-xs text-orange-800">
                                        Usulan klien: <b>{aksi.n.usulan_klien?.tanggal} • {aksi.n.usulan_klien?.jam}</b>
                                    </p>
                                </div>
                                <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">Alasan *</label>
                                <textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus
                                    placeholder="Mis. tim sedang menangani acara lain pada jam tersebut…"
                                    className="w-full px-4 py-2.5 mb-3 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                                <label className="block mb-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">Waktu pengganti *</label>
                                <PilihJadwal tgl={tgl} setTgl={setTgl} jam={jam} setJam={setJam} />
                            </>
                        )}

                        {aksi.tipe === 'tutup' && (
                            <>
                                <p className="mb-2 text-sm text-gray-600">
                                    Permintaan ditutup tanpa tanggapan lanjutan. Alasannya tercatat pada riwayat.
                                </p>
                                <textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus
                                    placeholder="Mis. klien sudah menyetujui lewat telepon…"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                            </>
                        )}

                        {aksi.tipe === 'revisi' && (
                            <>
                                <p className="mb-3 text-sm text-gray-600">
                                    Penawaran hasil pembahasan diajukan ulang ke Pihak Manajemen.
                                </p>
                                <ul className="p-3 space-y-1.5 text-xs rounded-xl bg-violet-50 text-violet-800">
                                    <li>• Penawaran yang sudah disetujui digantikan oleh versi ini.</li>
                                    <li>• Dokumen PDF baru disusun dari data acara terkini, dan dikirim ke klien setelah Manajemen menyetujuinya.</li>
                                    <li>• Jawaban klien atas penawaran lama dikosongkan supaya ia dapat merespons versi barunya.</li>
                                </ul>
                                <p className="mt-3 text-xs text-gray-500">
                                    Pastikan harga dan rincian acaranya sudah dibetulkan sebelum diajukan.
                                </p>
                            </>
                        )}

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={kirim} disabled={proses}
                                className={`flex-1 py-2.5 text-sm font-black text-white rounded-xl hover:brightness-110 disabled:opacity-50 ${
                                    aksi.tipe === 'revisi' ? 'bg-violet-600' : 'bg-[#FF2D55]'}`}>
                                {proses ? 'Mengirim…'
                                    : aksi.tipe === 'tutup' ? 'Ya, tutup'
                                    : aksi.tipe === 'revisi' ? 'Ajukan revisi'
                                    : 'Kirim'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EventMarketingLayout>
    );
}
