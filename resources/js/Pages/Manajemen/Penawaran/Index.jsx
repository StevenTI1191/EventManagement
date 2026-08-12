import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ManajemenLayout from '@/Layouts/ManajemenLayout';
import {
    FileCheck2, Building2, CalendarDays, MapPin, Users, UserRound, Clock,
    CheckCircle2, XCircle, X, FileText, AlertTriangle, MailWarning, Inbox,
} from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const badgeStatus = (s) => ({
    Diajukan:  'bg-amber-100 text-amber-700',
    Disetujui: 'bg-emerald-100 text-emerald-700',
    Ditolak:   'bg-red-100 text-red-600',
}[s] || 'bg-gray-100 text-gray-600');

/** Satu keterangan singkat berikon, dipakai berulang pada kartu. */
const Rinci = ({ icon: Icon, children }) => (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon size={13} className="text-gray-400 shrink-0" /> {children}
    </span>
);

export default function PenawaranIndex({ menunggu = [], riwayat = [] }) {
    const { flash, errors = {} } = usePage().props;
    const [aksi, setAksi] = useState(null);   // { e, tipe: 'setujui' | 'tolak' }
    const [catatan, setCatatan] = useState('');
    const [proses, setProses] = useState(false);

    const buka = (e, tipe) => { setCatatan(''); setAksi({ e, tipe }); };

    const kirim = () => {
        if (proses) return;
        if (aksi.tipe === 'tolak' && catatan.trim().length < 5) return;
        setProses(true);
        const nama = aksi.tipe === 'setujui' ? 'manajemen.penawaran.setujui' : 'manajemen.penawaran.tolak';
        router.patch(route(nama, aksi.e.id_event), aksi.tipe === 'tolak' ? { catatan } : {}, {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        });
    };

    return (
        <ManajemenLayout>
            <Head title="Persetujuan Penawaran" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <FileCheck2 size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Persetujuan Penawaran</h1>
                    {menunggu.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-black text-white bg-[#FF2D55] rounded-full">
                            {menunggu.length}
                        </span>
                    )}
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Penawaran yang disusun Tim Event Marketing tidak langsung sampai ke klien. Dokumennya baru
                    dikirimkan setelah Anda menyetujuinya di sini. Bila ditolak, tahap acara tidak diturunkan —
                    Event Marketing memperbaiki lalu mengajukannya kembali.
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

                {/* ── Antrean menunggu keputusan ──────────────────────────── */}
                <h2 className="mb-3 text-sm font-black tracking-wider text-gray-500 uppercase">
                    Menunggu Keputusan Anda
                </h2>

                {menunggu.length === 0 ? (
                    <div className="py-14 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <Inbox size={38} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Tidak ada penawaran yang menunggu.</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Penawaran akan muncul di sini begitu Event Marketing mengajukannya.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {menunggu.map((e) => {
                            const belumLengkap = e.kelengkapan.length > 0;
                            return (
                                <div key={e.id_event} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-base font-extrabold text-gray-900">{e.nama_event}</p>
                                            <p className="mt-0.5 text-xs text-gray-400">
                                                {e.kategori || 'Tanpa kategori'} • tahap {e.status}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-[#FF2D55]">{rupiah(e.nilai)}</p>
                                            <p className="text-[11px] text-gray-400">nilai penawaran</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 mt-4 sm:grid-cols-2">
                                        <Rinci icon={Building2}>{e.client || '—'}{e.client_pic ? ` (${e.client_pic})` : ''}</Rinci>
                                        <Rinci icon={UserRound}>PIC: {e.pic || '—'}</Rinci>
                                        <Rinci icon={CalendarDays}>{e.tgl_acara || '—'}{e.jam ? ` • ${e.jam}` : ''}</Rinci>
                                        <Rinci icon={MapPin}>{e.area || '—'}</Rinci>
                                        <Rinci icon={Users}>{e.pax ? `${e.pax} pax` : '— pax'}</Rinci>
                                        <Rinci icon={Clock}>
                                            Diajukan {e.diajukan_oleh || '—'}
                                            {e.menunggu_sejak ? ` • menunggu ${e.menunggu_sejak}` : ''}
                                        </Rinci>
                                    </div>

                                    {/* Diberitahukan sejak awal, bukan baru saat tombol ditekan. */}
                                    {belumLengkap && (
                                        <div className="flex gap-2 p-3 mt-4 text-xs border border-amber-200 rounded-xl bg-amber-50 text-amber-800">
                                            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                            <span>
                                                <b>Belum bisa disetujui.</b> Data acara masih kurang:{' '}
                                                {e.kelengkapan.join(', ')}. Minta Event Marketing melengkapinya dulu.
                                            </span>
                                        </div>
                                    )}

                                    {!belumLengkap && !e.punya_email && (
                                        <div className="flex gap-2 p-3 mt-4 text-xs text-blue-800 border border-blue-200 rounded-xl bg-blue-50">
                                            <MailWarning size={15} className="mt-0.5 shrink-0" />
                                            <span>
                                                Klien ini belum memiliki alamat email. Penawaran tetap dapat disetujui,
                                                tetapi dokumennya perlu Anda kirimkan secara manual.
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <a href={route('manajemen.pipeline.penawaran', e.id_event)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                                            <FileText size={14} /> Lihat dokumen penawaran
                                        </a>
                                        <button onClick={() => buka(e, 'setujui')} disabled={belumLengkap}
                                            title={belumLengkap ? 'Lengkapi data acara dulu' : undefined}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed">
                                            <CheckCircle2 size={14} /> Setujui &amp; kirim ke klien
                                        </button>
                                        <button onClick={() => buka(e, 'tolak')}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-red-600 rounded-xl bg-red-50 hover:bg-red-100">
                                            <XCircle size={14} /> Tolak
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Riwayat keputusan ───────────────────────────────────── */}
                {riwayat.length > 0 && (
                    <>
                        <h2 className="mt-10 mb-3 text-sm font-black tracking-wider text-gray-500 uppercase">
                            Keputusan Terakhir
                        </h2>
                        <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-500 bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 font-bold text-left">Acara</th>
                                            <th className="px-4 py-2.5 font-bold text-left">Klien</th>
                                            <th className="px-4 py-2.5 font-bold text-right">Nilai</th>
                                            <th className="px-4 py-2.5 font-bold text-center">Keputusan</th>
                                            <th className="px-4 py-2.5 font-bold text-left">Ditinjau</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {riwayat.map((e) => (
                                            <tr key={e.id_event} className="align-top">
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-gray-900">{e.nama_event}</p>
                                                    <p className="text-[11px] text-gray-400">{e.tgl_acara || '—'}</p>
                                                    {e.status_penawaran === 'Ditolak' && e.catatan && (
                                                        <p className="mt-1 text-[11px] italic text-red-500">“{e.catatan}”</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{e.client || '—'}</td>
                                                <td className="px-4 py-3 font-bold text-right text-gray-900">{rupiah(e.nilai)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${badgeStatus(e.status_penawaran)}`}>
                                                        {e.status_penawaran}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {e.ditinjau_oleh || '—'}
                                                    <br />
                                                    <span className="text-gray-400">{e.ditinjau_pada || '—'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Konfirmasi ──────────────────────────────────────────────── */}
            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'setujui' ? 'Setujui penawaran' : 'Tolak penawaran'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <p className="text-sm text-gray-600">
                            <b>{aksi.e.nama_event}</b> — {rupiah(aksi.e.nilai)}
                        </p>

                        {aksi.tipe === 'setujui' ? (
                            <p className="mt-3 text-sm text-gray-600">
                                Dokumen penawaran akan dikirimkan ke klien saat ini juga
                                {aksi.e.punya_email ? ' melalui email' : ' — klien belum punya email, jadi perlu dikirim manual'},
                                dan penawarannya muncul di portal klien untuk diterima atau ditolak.
                            </p>
                        ) : (
                            <>
                                <p className="mt-3 mb-2 text-sm text-gray-600">
                                    Tahap acara tidak diturunkan. Catatan Anda dikirim ke Tim Event Marketing sebagai
                                    dasar perbaikan sebelum diajukan kembali.
                                </p>
                                <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} autoFocus
                                    placeholder="Mis. harga di bawah margin minimum, mohon dinaikkan…"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 resize-none rounded-xl focus:border-[#FF2D55] focus:outline-none" />
                                {catatan.trim().length > 0 && catatan.trim().length < 5 && (
                                    <p className="mt-1 text-xs font-semibold text-red-600">Catatan minimal 5 karakter.</p>
                                )}
                            </>
                        )}

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={kirim}
                                disabled={proses || (aksi.tipe === 'tolak' && catatan.trim().length < 5)}
                                className={`flex-1 py-2.5 text-sm font-black text-white rounded-xl disabled:opacity-50 ${aksi.tipe === 'setujui' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                {proses ? 'Memproses…' : aksi.tipe === 'setujui' ? 'Ya, setujui & kirim' : 'Ya, tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}
