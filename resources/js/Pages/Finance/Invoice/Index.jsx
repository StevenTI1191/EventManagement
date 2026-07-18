import { useState } from 'react';
import FinanceLayout from '@/Layouts/FinanceLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Receipt, FileDown, MessageCircle, CheckCircle2, Building2, CalendarDays, Plus, Pencil, X } from 'lucide-react';

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const tanggal = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function FinanceInvoiceIndex({ events = [] }) {
    const { flash } = usePage().props;
    const [proses, setProses] = useState(null);

    const terbitkan = (idEvent, tipe) => {
        setProses(`${idEvent}-${tipe}`);
        router.post(route('finance.invoice.store', idEvent), { tipe }, {
            preserveScroll: true,
            onFinish: () => setProses(null),
        });
    };

    const tandaiLunas = (idInvoice) => {
        if (!confirm('Tandai invoice ini sebagai LUNAS? Untuk DP, status event otomatis menjadi Upcoming.')) return;
        setProses(`lunas-${idInvoice}`);
        router.patch(route('finance.invoice.lunas', idInvoice), {}, {
            preserveScroll: true,
            onFinish: () => setProses(null),
        });
    };

    const cariInvoice = (ev, tipe) => (ev.invoices || []).find((i) => i.tipe === tipe);

    const [editInv, setEditInv] = useState(null); // invoice yang sedang diedit
    const [editForm, setEditForm] = useState({ nominal: '', tgl_jatuh_tempo: '', keterangan: '' });

    const bukaEdit = (inv) => {
        setEditForm({
            nominal: inv.nominal ?? '',
            tgl_jatuh_tempo: (inv.tgl_jatuh_tempo || '').slice(0, 10),
            keterangan: inv.keterangan ?? '',
        });
        setEditInv(inv);
    };

    const simpanEdit = () => {
        if (proses) return;
        setProses(`edit-${editInv.id_invoice}`);
        router.put(route('finance.invoice.update', editInv.id_invoice), editForm, {
            preserveScroll: true,
            onSuccess: () => setEditInv(null),
            onFinish: () => setProses(null),
        });
    };

    return (
        <FinanceLayout>
            <Head title="Invoice — Laksamana Muda" />

            <div className="mb-6">
                <div className="flex items-center gap-2">
                    <Receipt size={24} className="text-[#FF2D55]" />
                    <h1 className="text-3xl font-extrabold text-gray-900">Invoice</h1>
                </div>
                <p className="mt-1 font-medium text-gray-500">
                    Event tahap <b>Deal</b> ditagih DP 50%. Setelah DP lunas, status event menjadi <b>Upcoming</b> dan
                    invoice pelunasan 50% dapat diterbitkan.
                </p>
            </div>

            {flash?.success && (
                <div className="p-4 mb-5 text-sm font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl">✅ {flash.success}</div>
            )}
            {flash?.error && (
                <div className="p-4 mb-5 text-sm font-bold text-red-700 border border-red-200 bg-red-50 rounded-xl">⚠️ {flash.error}</div>
            )}

            {events.length === 0 && (
                <div className="p-10 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <p className="text-sm text-gray-400">
                        Belum ada event yang siap ditagih. Event muncul di sini setelah mencapai tahap <b>Deal</b> di Pipeline.
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {events.map((ev) => {
                    const dp  = cariInvoice(ev, 'DP');
                    const pel = cariInvoice(ev, 'Pelunasan');

                    return (
                        <div key={ev.id_event} className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                            {/* Header event */}
                            <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-extrabold text-gray-900">{ev.nama_event}</h2>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                            ev.status_event === 'Deal' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {ev.status_event}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Building2 size={12} />{ev.client?.perusahaan_client || ev.client?.nama_client || '—'}</span>
                                        <span className="flex items-center gap-1"><CalendarDays size={12} />{tanggal(ev.tgl_mulai_event)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Total Nilai Acara</p>
                                    <p className="text-lg font-extrabold text-[#FF2D55]">{rupiah(ev.deal_harga_event)}</p>
                                </div>
                            </div>

                            {/* Dua kartu tagihan */}
                            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                                {[
                                    { tipe: 'DP',        judul: 'DP 50%',        nominal: ev.nominal_dp,        inv: dp,  aktif: ev.status_event === 'Deal' },
                                    { tipe: 'Pelunasan', judul: 'Pelunasan 50%', nominal: ev.nominal_pelunasan, inv: pel, aktif: dp?.status === 'Lunas' },
                                ].map((t) => (
                                    <div key={t.tipe} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-800">{t.judul}</h3>
                                            {t.inv && (
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                                    t.inv.status === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {t.inv.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-base font-extrabold text-gray-900">{rupiah(t.nominal)}</p>

                                        {t.inv ? (
                                            <>
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    No. {t.inv.nomor_invoice} · Jatuh tempo {tanggal(t.inv.tgl_jatuh_tempo)}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <a href={route('finance.invoice.pdf', t.inv.id_invoice)}
                                                       className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                                                        <FileDown size={12} /> PDF
                                                    </a>
                                                    {t.inv.wa_link ? (
                                                        <a href={t.inv.wa_link} target="_blank" rel="noopener noreferrer"
                                                           className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                                                            <MessageCircle size={12} /> {t.tipe === 'DP' ? 'Kirim WA' : 'Reminder WA'}
                                                        </a>
                                                    ) : (
                                                        <span className="px-2.5 py-1.5 text-[11px] font-bold text-gray-400 bg-gray-50 rounded-lg" title="Nomor WhatsApp klien belum diisi">
                                                            No. WA kosong
                                                        </span>
                                                    )}
                                                    {t.inv.status !== 'Lunas' && (
                                                        <>
                                                            <button onClick={() => bukaEdit(t.inv)}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                                                                <Pencil size={12} /> Edit
                                                            </button>
                                                            <button onClick={() => tandaiLunas(t.inv.id_invoice)}
                                                                    disabled={proses === `lunas-${t.inv.id_invoice}`}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#FF2D55] rounded-lg hover:bg-[#e02249] disabled:opacity-60">
                                                                <CheckCircle2 size={12} /> Tandai Lunas
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => terbitkan(ev.id_event, t.tipe)}
                                                disabled={!t.aktif || proses === `${ev.id_event}-${t.tipe}`}
                                                title={!t.aktif ? (t.tipe === 'DP' ? 'Hanya untuk event tahap Deal' : 'Terbitkan setelah DP lunas') : ''}
                                                className="flex items-center gap-1.5 px-3 py-2 mt-3 text-xs font-bold text-white bg-gray-800 rounded-lg hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Plus size={13} strokeWidth={3} /> Terbitkan Invoice {t.tipe}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal edit invoice */}
            {editInv && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                     onClick={() => proses || setEditInv(null)}>
                    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Pencil size={18} className="text-[#FF2D55]" />
                                <h3 className="text-lg font-extrabold text-gray-900">Edit Invoice {editInv.tipe}</h3>
                            </div>
                            <button onClick={() => setEditInv(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="mb-4 text-xs text-gray-400">No. {editInv.nomor_invoice}</p>

                        <label className="block mb-1 text-xs font-bold text-gray-600">Nominal (Rp)</label>
                        <input type="number" min="1" value={editForm.nominal}
                               onChange={(e) => setEditForm({ ...editForm, nominal: e.target.value })}
                               className="w-full p-3 mb-4 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                        <label className="block mb-1 text-xs font-bold text-gray-600">Jatuh Tempo</label>
                        <input type="date" value={editForm.tgl_jatuh_tempo}
                               onChange={(e) => setEditForm({ ...editForm, tgl_jatuh_tempo: e.target.value })}
                               className="w-full p-3 mb-4 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                        <label className="block mb-1 text-xs font-bold text-gray-600">Keterangan <span className="font-normal text-gray-400">(opsional)</span></label>
                        <input type="text" maxLength={500} value={editForm.keterangan}
                               onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                               className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:border-[#FF2D55] focus:outline-none" />

                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setEditInv(null)} disabled={!!proses}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">Batal</button>
                            <button onClick={simpanEdit} disabled={!!proses}
                                    className="px-4 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-xl hover:bg-[#e02249] disabled:opacity-60">
                                {proses === `edit-${editInv.id_invoice}` ? 'Menyimpan…' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FinanceLayout>
    );
}
