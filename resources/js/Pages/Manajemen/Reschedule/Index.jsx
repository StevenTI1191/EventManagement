import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ManajemenLayout from '@/Layouts/ManajemenLayout';
import {
    CalendarClock, CalendarDays, Building2, CheckCircle2, XCircle, X, Ban, ArrowRight,
} from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const tanggal = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const badgeStatus = (s) => ({
    Diajukan:  'bg-amber-100 text-amber-700',
    Disetujui: 'bg-emerald-100 text-emerald-700',
    Ditolak:   'bg-red-100 text-red-600',
}[s] || 'bg-gray-100 text-gray-600');

export default function RescheduleIndex({ pengajuan = [], pembatalan = [] }) {
    const { flash, errors = {} } = usePage().props;
    const [aksi, setAksi] = useState(null);   // { p, tipe: 'setujui' | 'tolak' }
    const [catatan, setCatatan] = useState('');
    const [proses, setProses] = useState(false);

    const kirim = () => {
        if (proses) return;
        if (aksi.tipe === 'tolak' && catatan.trim().length < 5) return;
        setProses(true);
        const nama = aksi.tipe === 'setujui' ? 'manajemen.reschedule.setujui' : 'manajemen.reschedule.tolak';
        router.patch(route(nama, aksi.p.id), aksi.tipe === 'tolak' ? { catatan } : {}, {
            preserveScroll: true,
            onSuccess: () => setAksi(null),
            onFinish: () => setProses(false),
        });
    };

    // Dihitung dari penanda yang dikirim server, bukan dari status pengajuannya
    // saja — supaya angka di sini sama persis dengan lencana pada menu.
    const menunggu = pengajuan.filter((p) => p.dapat_diproses).length;

    return (
        <ManajemenLayout>
            <Head title="Ganti Tanggal Acara" />

            <div className="max-w-5xl px-4 py-6 mx-auto sm:px-6">
                <div className="flex items-center gap-3 mb-1">
                    <CalendarClock size={22} className="text-[#FF2D55]" />
                    <h1 className="text-2xl font-extrabold text-gray-900">Ganti Tanggal Acara</h1>
                </div>
                <p className="mb-5 text-sm text-gray-500">
                    Klien yang acaranya tidak jadi pada tanggal semula dapat meminta jadwalnya dipindahkan agar
                    uang mukanya tidak hangus. Karena menyangkut ketersediaan venue, pemindahan jadwal perlu
                    persetujuan Anda — sistem memeriksa ulang bentrok jadwal saat disetujui.
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

                <div className="inline-flex px-4 py-2 mb-5 text-sm font-bold border rounded-xl bg-amber-50 border-amber-200 text-amber-700">
                    {menunggu} permintaan menunggu persetujuan Anda
                </div>

                {pengajuan.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-gray-100 border-dashed rounded-2xl">
                        <CalendarClock size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-bold text-gray-500">Belum ada permintaan ganti tanggal.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pengajuan.map((p) => (
                            <div key={p.id} className={`p-5 bg-white border shadow-sm rounded-2xl ${p.status === 'Diajukan' ? 'border-[#FF2D55]/40 ring-1 ring-[#FF2D55]/10' : 'border-gray-100'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-extrabold text-gray-900">{p.event?.nama_event || '—'}</h2>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeStatus(p.status)}`}>{p.status}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Building2 size={12} />{p.event?.client?.perusahaan_client || p.event?.client?.nama_client || '—'}</span>
                                            <span>Diminta {tanggal(p.created_at)}</span>
                                            {p.event?.area_event && <span>Area: {p.event.area_event}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Nilai Acara</p>
                                        <p className="text-lg font-extrabold text-[#FF2D55]">{rupiah(p.event?.deal_harga_event)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 p-3 mt-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Jadwal semula</p>
                                        <p className="text-sm font-bold text-gray-500 line-through">{tanggal(p.tgl_lama)}</p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400" />
                                    <div>
                                        <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Diminta pindah ke</p>
                                        <p className="text-sm font-extrabold text-gray-900">
                                            {tanggal(p.tgl_baru)}
                                            {p.tgl_selesai_baru && <> &ndash; {tanggal(p.tgl_selesai_baru)}</>}
                                        </p>
                                    </div>
                                    {p.event?.jam_mulai && (
                                        <div className="ml-auto">
                                            <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Jam (tetap)</p>
                                            <p className="text-sm font-bold text-gray-700">
                                                {String(p.event.jam_mulai).substring(0, 5)}–{String(p.event.jam_selesai || '').substring(0, 5)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Alasan Klien</span>
                                    <p className="mt-1">{p.alasan}</p>
                                </div>

                                {p.status === 'Ditolak' && (
                                    <p className="mt-3 text-xs font-bold text-red-600">Ditolak: {p.catatan_tolak}</p>
                                )}
                                {p.status === 'Disetujui' && (
                                    <p className="mt-3 text-xs font-bold text-emerald-600">
                                        Jadwal sudah dipindahkan{p.penyetuju?.nama_pegawai ? ` oleh ${p.penyetuju.nama_pegawai}` : ''}.
                                    </p>
                                )}

                                {p.status === 'Diajukan' && (
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        {/* Menyetujui pemindahan hanya mungkin selama acaranya
                                            memang masih dapat dipindahkan. Untuk yang tidak,
                                            tombolnya diganti keterangan — sebelumnya tombol itu
                                            tetap muncul lalu selalu berakhir ditolak server.
                                            Tombol Tolak tetap ada supaya pengajuannya dapat
                                            dibereskan, bukan menggantung selamanya. */}
                                        {p.dapat_diproses ? (
                                        <button onClick={() => setAksi({ p, tipe: 'setujui' })}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl hover:bg-green-100">
                                            <CheckCircle2 size={15} /> Setujui & pindahkan jadwal
                                        </button>
                                        ) : (
                                        <span className="px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200 bg-gray-50 rounded-xl">
                                            Acara berstatus {p.event?.status_event ?? '—'}, jadwalnya tidak dapat dipindahkan lagi
                                        </span>
                                        )}
                                        <button onClick={() => { setCatatan(''); setAksi({ p, tipe: 'tolak' }); }}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100">
                                            <XCircle size={15} /> Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Riwayat pembatalan — hanya catatan, tidak ada yang perlu diputuskan. */}
                <div className="flex items-center gap-2 mt-10 mb-3">
                    <Ban size={18} className="text-gray-400" />
                    <h2 className="font-extrabold text-gray-900">Riwayat Pembatalan</h2>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                    Pembatalan berlaku seketika dan uang muka klien hangus, sehingga tidak memerlukan persetujuan.
                    Daftar ini hanya catatan.
                </p>

                {pembatalan.length === 0 ? (
                    <div className="p-6 text-sm text-center text-gray-400 bg-white border border-gray-100 border-dashed rounded-2xl">
                        Belum ada acara yang dibatalkan klien.
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-gray-500">
                                    <th className="px-4 py-3 font-bold">Acara</th>
                                    <th className="px-4 py-3 font-bold">Klien</th>
                                    <th className="px-4 py-3 font-bold">Dibatalkan</th>
                                    <th className="px-4 py-3 font-bold text-right">Uang Hangus</th>
                                    <th className="px-4 py-3 font-bold">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pembatalan.map((b) => (
                                    <tr key={b.id}>
                                        <td className="px-4 py-3 font-bold text-gray-900">{b.event?.nama_event || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{b.client?.perusahaan_client || b.client?.nama_client || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                            <span className="flex items-center gap-1"><CalendarDays size={12} />{tanggal(b.diproses_pada || b.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-right text-gray-900 whitespace-nowrap">{rupiah(b.dp_hangus)}</td>
                                        <td className="px-4 py-3 text-gray-500">{b.alasan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {aksi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => proses || setAksi(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-extrabold text-gray-900">
                                {aksi.tipe === 'setujui' ? 'Setujui ganti tanggal' : 'Tolak permintaan'}
                            </h3>
                            <button onClick={() => setAksi(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="mb-3 text-xs text-gray-500">{aksi.p.event?.nama_event}</p>

                        {aksi.tipe === 'setujui' ? (
                            <div className="p-3 mb-4 text-xs border rounded-xl bg-emerald-50 border-emerald-200 text-emerald-700">
                                Jadwal acara akan dipindahkan ke <b>{tanggal(aksi.p.tgl_baru)}</b>. Uang muka klien tetap
                                berlaku. Sistem memeriksa ulang bentrok jadwal — bila tanggal itu ternyata sudah terisi,
                                persetujuan akan ditolak sistem.
                            </div>
                        ) : (
                            <>
                                <div className="p-3 mb-4 text-xs border rounded-xl bg-red-50 border-red-200 text-red-700">
                                    Jadwal semula tetap berlaku dan klien akan diberi tahu alasannya.
                                </div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    Alasan penolakan <span className="font-normal normal-case text-red-500">* wajib</span>
                                </label>
                                <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
                                    placeholder="Mis. tanggal tersebut sudah dipesan acara lain…"
                                    className="w-full px-4 py-3 mb-4 text-sm text-gray-800 border border-gray-200 resize-none rounded-xl focus:border-red-400 focus:outline-none" />
                            </>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setAksi(null)} disabled={proses}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                                Kembali
                            </button>
                            <button onClick={kirim}
                                disabled={proses || (aksi.tipe === 'tolak' && catatan.trim().length < 5)}
                                className={`flex-1 py-2.5 text-sm font-black text-white rounded-xl disabled:opacity-50 ${aksi.tipe === 'setujui' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {proses ? 'Memproses…' : (aksi.tipe === 'setujui' ? 'Ya, pindahkan' : 'Ya, tolak')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}
