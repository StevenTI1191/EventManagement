import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    ChevronLeft, CalendarDays, Clock, MapPin, User, Users, Wallet, Target,
    AlertTriangle, CheckCircle2, MessageCircle, ListChecks, Save, Send, Building2,
} from 'lucide-react';
import RupiahInput from '@/Components/RupiahInput';
import SearchableSelect from '@/Components/SearchableSelect';
import TimePicker from '@/Components/TimePicker';
import DateTimePicker from '@/Components/DateTimePicker';
import Countdown from '@/Components/Countdown';

import { KATEGORI_VALUES as EVENT_CATEGORIES } from '@/constants/kategori';

const STATUS_WARNA = {
    Planning:     'bg-gray-100 text-gray-600 border-gray-200',
    Lead:         'bg-sky-50 text-sky-700 border-sky-200',
    Negotiation:  'bg-amber-50 text-amber-700 border-amber-200',
    Deal:         'bg-violet-50 text-violet-700 border-violet-200',
    Upcoming:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    Penyelesaian: 'bg-orange-50 text-orange-700 border-orange-200',
    Done:         'bg-gray-100 text-gray-500 border-gray-200',
    Batal:        'bg-red-50 text-red-600 border-red-200',
};

/** Apa yang harus terjadi berikutnya pada tiap tahap — supaya alurnya tidak menggantung. */
const LANGKAH = {
    Planning:     'Lengkapi to-do lalu ajukan ke klien agar masuk pipeline.',
    Lead:         'Lengkapi detail acara di bawah, lalu geser kartu ke Negotiation di papan Pipeline.',
    Negotiation:  'Kirim penawaran ke klien. Begitu klien menerimanya di portal, status otomatis naik ke Deal.',
    Deal:         'Menunggu pembayaran DP. Invoice diterbitkan Finance.',
    Upcoming:     'Persiapan berjalan. Pantau to-do list divisi sampai hari-H.',
    Penyelesaian: 'Acara sudah lewat, tapi pekerjaan atau pelunasan belum tuntas.',
    Done:         'Event selesai dan tuntas.',
    Batal:        'Event dibatalkan.',
};

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tanggal = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const jamPendek = (j) => (j ? String(j).slice(0, 5) : '—');

/** Format "YYYY-MM-DDTHH:MM" jadi "3 Jun 2026, 20:13". */
const tglJam = (v) => {
    if (! v) return '—';
    const [t, j = ''] = String(v).split('T');
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        + (j ? `, ${j.slice(0, 5)}` : '');
};

function Baris({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3">
            <Icon size={15} className="mt-0.5 text-gray-400 shrink-0" />
            <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</div>
                <div className="text-sm font-semibold text-gray-800 break-words">{children}</div>
            </div>
        </div>
    );
}

function Kartu({ judul, children, aksi = null }) {
    return (
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold tracking-wide text-gray-800 uppercase">{judul}</h2>
                {aksi}
            </div>
            {children}
        </div>
    );
}

function Field({ label, error, children, hint = null }) {
    return (
        <div>
            <label className="block mb-1 text-sm font-bold text-gray-700">{label}</label>
            {children}
            {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
}

const inputCls = 'w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none';

export default function EventDetail({
    Layout, event, kelengkapan = [], statusManual = [], progres = {}, tagihan = {},
    appointments = [], tugasPerKategori = {},
    followUps = [], waFollowUp, clients = [], pegawais = [], routes = {},
}) {
    const dariPipeline = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('dari') === 'pipeline';

    const [catatan, setCatatan] = useState('');
    const [tglBerikutnya, setTglBerikutnya] = useState('');
    const [kirimFu, setKirimFu] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        // Ikut dikirim agar tombol kembali tetap pulang ke pipeline setelah simpan.
        dari: dariPipeline ? 'pipeline' : '',
        status_event: event.status_event || '',
        nama_event: event.nama_event || '',
        kategori_event: event.kategori_event || '',
        deskripsi_event: event.deskripsi_event || '',
        id_client: event.id_client ? String(event.id_client) : '',
        id_pegawai: event.id_pegawai ? String(event.id_pegawai) : '',
        tgl_mulai_event: event.tgl_mulai_event ? String(event.tgl_mulai_event).slice(0, 10) : '',
        tgl_selesai_event: event.tgl_selesai_event ? String(event.tgl_selesai_event).slice(0, 10) : '',
        jam_mulai: event.jam_mulai ? String(event.jam_mulai).slice(0, 5) : '',
        jam_selesai: event.jam_selesai ? String(event.jam_selesai).slice(0, 5) : '',
        area_event: event.area_event || '',
        jumlah_pax: event.jumlah_pax ?? '',
        harga_per_pax: event.harga_per_pax ?? '',
        deal_harga_event: event.deal_harga_event ?? '',
        target_pax: event.target_pax ?? '',
        target_omset: event.target_omset ?? '',
        // Keduanya datetime penuh (YYYY-MM-DDTHH:MM) — bisa jatuh di hari
        // berbeda dari acaranya, jadi tidak boleh dipangkas jadi jam saja.
        technical_meeting: event.technical_meeting || '',
        gladi_resik: event.gladi_resik || '',
        note_event: event.note_event || '',
        food_beverage_event: event.food_beverage_event || '',
        entairtainment_event: event.entairtainment_event || '',
        is_public: !!event.is_public,
        poster_event: null,
    });

    const simpan = (e) => {
        e.preventDefault();
        post(route(routes.update, event.id_event), { forceFormData: true, preserveScroll: true });
    };

    const catatFollowUp = (e) => {
        e.preventDefault();
        if (!catatan.trim() || !routes.followUp || !event.id_client) return;
        setKirimFu(true);
        router.post(route(routes.followUp, event.id_client), {
            catatan,
            id_event: event.id_event,
            tgl_berikutnya: tglBerikutnya || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setCatatan(''); setTglBerikutnya(''); },
            onFinish: () => setKirimFu(false),
        });
    };

    const badge = STATUS_WARNA[event.status_event] || STATUS_WARNA.Planning;
    const lunas = (tagihan.terbayar || 0) >= (tagihan.deal || 0) && (tagihan.deal || 0) > 0;

    return (
        <Layout>
            <Head title={`${event.nama_event} — Laksamana Muda`} />

            {/* Kembali ke asal — pipeline atau daftar event */}
            <Link href={route(dariPipeline ? routes.pipeline : routes.index)}
                className="inline-flex items-center gap-1 mb-4 text-sm text-gray-400 hover:text-gray-600">
                <ChevronLeft size={16} /> {dariPipeline ? 'Kembali ke Pipeline' : 'Kembali ke Events'}
            </Link>

            {/* HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${badge}`}>
                            {event.status_event}
                        </span>
                        {event.kategori_event && (
                            <span className="px-2 py-0.5 bg-pink-50 text-[#FF2D55] text-[10px] font-black uppercase tracking-wider rounded-full">
                                {event.kategori_event}
                            </span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider rounded-full">
                            {event.tipe_event}
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{event.nama_event}</h1>
                    <p className="mt-1 text-sm text-gray-500">{LANGKAH[event.status_event]}</p>
                </div>

                {event.status_event === 'Upcoming' && (
                    <div>
                        <div className="mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase text-right">Menuju Hari-H</div>
                        <Countdown target={event.tgl_mulai_event} jam={event.jam_mulai} />
                    </div>
                )}
            </div>

            {/* DAFTAR PERIKSA — hanya selama event belum berjalan */}
            {kelengkapan.length > 0 && ['Planning', 'Lead', 'Negotiation', 'Deal'].includes(event.status_event) && (
                <div className="flex items-start gap-3 p-4 mb-6 border border-amber-200 bg-amber-50 rounded-2xl">
                    <AlertTriangle size={18} className="mt-0.5 text-amber-500 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">
                            Belum bisa naik tahap — {kelengkapan.length} detail masih kosong
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                            Isi lewat form di bawah halaman ini, lalu geser kartunya di papan Pipeline.
                        </p>
                        <ul className="flex flex-wrap gap-1.5 mt-2">
                            {kelengkapan.map((k) => (
                                <li key={k} className="px-2 py-1 text-xs font-bold bg-white border rounded-lg text-amber-700 border-amber-200">
                                    {k}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {kelengkapan.length === 0 && ['Lead', 'Negotiation'].includes(event.status_event) && (
                <div className="flex items-center gap-3 p-4 mb-6 border border-green-200 bg-green-50 rounded-2xl">
                    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                    <p className="text-sm font-bold text-green-800">
                        Detail sudah lengkap. Kartu ini siap digeser ke tahap berikutnya di papan Pipeline.
                    </p>
                </div>
            )}

            {/* RINGKASAN */}
            <div className="grid grid-cols-1 gap-5 mb-5 lg:grid-cols-3">
                <Kartu judul="Klien & Penanggung Jawab">
                    <div className="space-y-3">
                        <Baris icon={User} label="Klien">
                            {event.client ? (
                                routes.client ? (
                                    <Link href={route(routes.client, event.client.id)} className="text-[#FF2D55] hover:underline">
                                        {event.client.nama_client}
                                    </Link>
                                ) : event.client.nama_client
                            ) : <span className="text-gray-400">Acara internal — tanpa klien</span>}
                        </Baris>
                        {event.client?.perusahaan_client && (
                            <Baris icon={Building2} label="Perusahaan">{event.client.perusahaan_client}</Baris>
                        )}
                        <Baris icon={Users} label="PIC">{event.pic?.nama_pegawai || '—'}</Baris>
                    </div>
                </Kartu>

                <Kartu judul="Jadwal & Tempat">
                    <div className="space-y-3">
                        <Baris icon={CalendarDays} label="Tanggal">
                            {tanggal(event.tgl_mulai_event)}
                            {event.tgl_selesai_event && event.tgl_selesai_event !== event.tgl_mulai_event
                                && ` — ${tanggal(event.tgl_selesai_event)}`}
                        </Baris>
                        <Baris icon={Clock} label="Jam">
                            {jamPendek(event.jam_mulai)} – {jamPendek(event.jam_selesai)}
                        </Baris>
                        <Baris icon={MapPin} label="Area">{event.area_event || '—'}</Baris>
                        {event.technical_meeting && (
                            <Baris icon={Clock} label="Technical Meeting">{tglJam(event.technical_meeting)}</Baris>
                        )}
                        {event.gladi_resik && (
                            <Baris icon={Clock} label="Gladi Resik">{tglJam(event.gladi_resik)}</Baris>
                        )}
                    </div>
                </Kartu>

                <Kartu judul="Nilai & Tagihan">
                    <div className="space-y-3">
                        <Baris icon={Wallet} label="Deal Harga">{rp(event.deal_harga_event)}</Baris>
                        <Baris icon={Users} label="Pax">
                            {event.jumlah_pax || 0} pax
                            {event.harga_per_pax ? ` · ${rp(event.harga_per_pax)}/pax` : ''}
                        </Baris>
                        {/* Target tetap terlihat setelah tahap Planning lewat */}
                        {event.dari_planning && (
                            <Baris icon={Target} label="Target">
                                {event.target_pax ? `${event.target_pax} pax` : '—'}
                                {event.target_omset ? ` · omset ${rp(event.target_omset)}` : ''}
                            </Baris>
                        )}
                        {(tagihan.deal || 0) > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1 text-xs">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Terbayar</span>
                                    <span className={`font-extrabold ${lunas ? 'text-green-600' : 'text-gray-700'}`}>
                                        {rp(tagihan.terbayar)} / {rp(tagihan.deal)}
                                    </span>
                                </div>
                                <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                                    <div className={`h-full transition-all ${lunas ? 'bg-green-500' : 'bg-[#FF2D55]'}`}
                                        style={{ width: `${Math.min(100, ((tagihan.terbayar || 0) / (tagihan.deal || 1)) * 100)}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </Kartu>
            </div>

            {/* APPOINTMENT ASAL — jejak dari permintaan awal klien sampai acara jadi */}
            {appointments.length > 0 && (
                <div className="mb-5">
                    <Kartu judul="Appointment Terkait">
                        <ul className="space-y-3">
                            {appointments.map((a) => (
                                <li key={a.id} className="p-3 bg-gray-50 rounded-xl">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-gray-800">{a.jenis_event || 'Meeting'}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                                            a.status === 'Selesai' ? 'bg-green-50 text-green-700'
                                                : a.status === 'Dibatalkan' ? 'bg-red-50 text-red-600'
                                                : 'bg-purple-50 text-purple-700'
                                        }`}>
                                            {a.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        <CalendarDays size={12} className="inline mr-1" />
                                        {tanggal(a.tgl_konfirmasi || a.tgl_request)}
                                        {(a.jam_konfirmasi || a.jam_request) && `, ${jamPendek(a.jam_konfirmasi || a.jam_request)}`}
                                        {a.pegawai?.nama_pegawai && ` · ditangani ${a.pegawai.nama_pegawai}`}
                                    </p>
                                    {a.estimasi_budget > 0 && (
                                        <p className="mt-0.5 text-xs text-gray-400">Estimasi awal klien: {rp(a.estimasi_budget)}</p>
                                    )}
                                    {a.catatan_meeting && (
                                        <div className="p-2 mt-2 text-xs text-gray-600 bg-white border border-gray-100 rounded-lg whitespace-pre-wrap">
                                            <span className="block mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Hasil Meeting</span>
                                            {a.catatan_meeting}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Kartu>
                </div>
            )}

            {/* TO-DO & FOLLOW-UP */}
            <div className="grid grid-cols-1 gap-5 mb-5 lg:grid-cols-2">
                <Kartu
                    judul="Progres To-Do"
                    aksi={routes.todo && progres.total > 0 && (
                        <Link href={route(routes.todo, event.id_event)} className="text-xs font-bold text-[#FF2D55] hover:underline">
                            Buka papan
                        </Link>
                    )}
                >
                    {progres.total > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-gray-500">{progres.done} dari {progres.total} selesai</span>
                                <span className="text-sm font-extrabold text-gray-800">{progres.persen}%</span>
                            </div>
                            <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                                <div className="h-full bg-[#FF2D55] transition-all" style={{ width: `${progres.persen}%` }} />
                            </div>

                            {/* Rincian per kategori — hasil tahap perencanaan */}
                            {Object.keys(tugasPerKategori).length > 0 && (
                                <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                                    {Object.entries(tugasPerKategori).map(([kat, n]) => (
                                        <li key={kat} className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600 truncate">{kat}</span>
                                            <span className={`font-bold shrink-0 ${n.done === n.total ? 'text-green-600' : 'text-gray-500'}`}>
                                                {n.done}/{n.total}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="flex items-center gap-2 text-sm text-gray-400">
                            <ListChecks size={15} />
                            To-do dibuat otomatis saat event masuk Upcoming.
                        </p>
                    )}
                </Kartu>

                <Kartu
                    judul="Follow-Up"
                    aksi={event.client?.no_telp_client && waFollowUp && (
                        <a href={waFollowUp} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600">
                            <MessageCircle size={13} /> WhatsApp
                        </a>
                    )}
                >
                    {!event.id_client ? (
                        <p className="text-sm text-gray-400">Acara internal — tidak ada klien untuk di-follow-up.</p>
                    ) : (
                        <>
                            {routes.followUp && (
                                <form onSubmit={catatFollowUp} className="mb-4">
                                    <textarea
                                        value={catatan}
                                        onChange={(e) => setCatatan(e.target.value)}
                                        placeholder="Catat hasil follow-up…"
                                        className="w-full h-20 p-3 text-sm border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                                    />
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <input type="date" value={tglBerikutnya} onChange={(e) => setTglBerikutnya(e.target.value)}
                                            className="px-3 py-2 text-sm border-gray-200 rounded-lg bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none" />
                                        <span className="text-xs text-gray-400">pengingat berikutnya (opsional)</span>
                                        <button type="submit" disabled={kirimFu || !catatan.trim()}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 ml-auto bg-[#FF2D55] text-white text-sm font-bold rounded-lg hover:bg-[#e02249] disabled:opacity-50">
                                            <Send size={14} /> {kirimFu ? 'Menyimpan…' : 'Catat'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {followUps.length === 0 ? (
                                <p className="text-sm text-gray-400">Belum ada catatan follow-up untuk event ini.</p>
                            ) : (
                                <ul className="space-y-2 max-h-56 overflow-y-auto">
                                    {followUps.map((f) => (
                                        <li key={f.id} className="p-3 text-sm bg-gray-50 rounded-xl">
                                            <p className="text-gray-700">{f.catatan}</p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {f.pegawai?.nama_pegawai || 'Tim'} · {tanggal(f.created_at)}
                                                {f.tgl_berikutnya && ` · tindak lanjut ${tanggal(f.tgl_berikutnya)}`}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </Kartu>
            </div>

            {/* FORM EDIT — hanya untuk peran yang berwenang mengubah.
                Finance menelusuri saja, jadi rute update-nya tidak dikirim. */}
            {routes.update && (
            <form onSubmit={simpan} className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900">Lengkapi Detail Event</h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {statusManual.length > 0
                                ? 'Acara sudah berjalan — statusnya bisa ditutup langsung dari sini.'
                                : 'Status tidak diubah dari sini — perpindahan tahap lewat papan Pipeline.'}
                        </p>
                    </div>
                    {statusManual.length > 0 && (
                        <div className="min-w-[190px]">
                            <label className="block mb-1 text-xs font-bold tracking-wider text-gray-400 uppercase">Status Event</label>
                            <select className={inputCls} value={data.status_event}
                                onChange={(e) => setData('status_event', e.target.value)}>
                                {statusManual.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="p-4 mb-6 border border-red-200 bg-red-50 rounded-2xl">
                        <ul className="text-xs text-red-500 list-disc list-inside space-y-0.5">
                            {Object.values(errors).map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    </div>
                )}

                <div className="space-y-5">
                    <Field label="Nama Event" error={errors.nama_event}>
                        <input type="text" className={inputCls} value={data.nama_event}
                            onChange={(e) => setData('nama_event', e.target.value)} />
                    </Field>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Kategori" error={errors.kategori_event}>
                            <select className={inputCls} value={data.kategori_event}
                                onChange={(e) => setData('kategori_event', e.target.value)}>
                                <option value="">Pilih Kategori</option>
                                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="PIC" error={errors.id_pegawai}>
                            <select className={inputCls} value={data.id_pegawai}
                                onChange={(e) => setData('id_pegawai', e.target.value)}>
                                <option value="">Pilih PIC</option>
                                {pegawais.map((p) => (
                                    <option key={p.id_pegawai} value={p.id_pegawai}>
                                        {p.nama_pegawai} — {p.posisi_pegawai}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    {event.tipe_event === 'Eksternal' && (
                        <Field label="Klien" error={errors.id_client}>
                            <SearchableSelect
                                options={clients.map((c) => ({
                                    value: c.id,
                                    label: c.nama_client + (c.perusahaan_client ? ` — ${c.perusahaan_client}` : ''),
                                }))}
                                value={data.id_client}
                                onChange={(v) => setData('id_client', v)}
                                emptyOption="— Pilih klien —"
                                searchPlaceholder="Cari nama klien / perusahaan…"
                            />
                        </Field>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Tanggal Mulai" error={errors.tgl_mulai_event}>
                            <input type="date" className={inputCls} value={data.tgl_mulai_event}
                                onChange={(e) => setData('tgl_mulai_event', e.target.value)} />
                        </Field>
                        <Field label="Tanggal Selesai" hint="Isi bila acara berlangsung lebih dari satu hari."
                            error={errors.tgl_selesai_event}>
                            <input type="date" className={inputCls} value={data.tgl_selesai_event}
                                onChange={(e) => setData('tgl_selesai_event', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Jam Mulai" error={errors.jam_mulai}>
                            <TimePicker value={data.jam_mulai} onChange={(v) => setData('jam_mulai', v)} />
                        </Field>
                        <Field label="Jam Selesai" error={errors.jam_selesai}>
                            <TimePicker value={data.jam_selesai} onChange={(v) => setData('jam_selesai', v)} />
                        </Field>
                    </div>

                    <Field label="Area Acara" error={errors.area_event}>
                        <input type="text" className={inputCls} placeholder="mis. Ballroom Hotel A"
                            value={data.area_event} onChange={(e) => setData('area_event', e.target.value)} />
                    </Field>

                    {/* Technical meeting & gladi resik hanya relevan untuk acara
                        klien — acara internal LM tidak melewati tahap itu. */}
                    {event.tipe_event === 'Eksternal' && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="Technical Meeting" hint="Tanggal & jam — boleh berbeda dari hari acara."
                                error={errors.technical_meeting}>
                                <DateTimePicker value={data.technical_meeting} onChange={(v) => setData('technical_meeting', v)} />
                            </Field>
                            <Field label="Gladi Resik" hint="Tanggal & jam — boleh berbeda dari hari acara."
                                error={errors.gladi_resik}>
                                <DateTimePicker value={data.gladi_resik} onChange={(v) => setData('gladi_resik', v)} />
                            </Field>
                        </div>
                    )}

                    <div className={`grid grid-cols-1 gap-5 ${event.tipe_event === 'Eksternal' ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
                        <Field label="Jumlah Pax" error={errors.jumlah_pax}>
                            <input type="number" min="0" className={inputCls} value={data.jumlah_pax}
                                onChange={(e) => setData('jumlah_pax', e.target.value)} />
                        </Field>
                        {/* Nilai kesepakatan hanya ada pada acara pesanan klien */}
                        {event.tipe_event === 'Eksternal' && (
                            <>
                                <Field label="Harga per Pax" error={errors.harga_per_pax}>
                                    <RupiahInput className={inputCls} value={data.harga_per_pax}
                                        onChange={(v) => setData('harga_per_pax', v)} />
                                </Field>
                                <Field label="Deal Harga" error={errors.deal_harga_event}>
                                    <RupiahInput className={inputCls} value={data.deal_harga_event}
                                        onChange={(v) => setData('deal_harga_event', v)} />
                                </Field>
                            </>
                        )}
                    </div>

                    {/* Target hanya ada pada acara yang melewati tahap perencanaan */}
                    {event.dari_planning && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="Target Pax" error={errors.target_pax}>
                                <input type="number" min="0" className={inputCls} value={data.target_pax}
                                    onChange={(e) => setData('target_pax', e.target.value)} />
                            </Field>
                            <Field label="Target Omset" error={errors.target_omset}
                                hint="Dipasang saat perencanaan — tetap bisa dilihat & disunting di sini.">
                                <RupiahInput className={inputCls} value={data.target_omset}
                                    onChange={(v) => setData('target_omset', v)} />
                            </Field>
                        </div>
                    )}

                    <Field label="Deskripsi" error={errors.deskripsi_event}>
                        <textarea className={`${inputCls} h-24`} value={data.deskripsi_event}
                            onChange={(e) => setData('deskripsi_event', e.target.value)} />
                    </Field>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Food & Beverage" error={errors.food_beverage_event}>
                            <textarea className={`${inputCls} h-20`} value={data.food_beverage_event}
                                onChange={(e) => setData('food_beverage_event', e.target.value)} />
                        </Field>
                        <Field label="Entertainment" error={errors.entairtainment_event}>
                            <textarea className={`${inputCls} h-20`} value={data.entairtainment_event}
                                onChange={(e) => setData('entairtainment_event', e.target.value)} />
                        </Field>
                    </div>

                    <Field label="Catatan" error={errors.note_event}>
                        <textarea className={`${inputCls} h-20`} value={data.note_event}
                            onChange={(e) => setData('note_event', e.target.value)} />
                    </Field>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Poster" hint="Kosongkan bila tidak ingin mengganti poster." error={errors.poster_event}>
                            <input type="file" accept="image/*" className={inputCls}
                                onChange={(e) => setData('poster_event', e.target.files[0] || null)} />
                        </Field>
                        <label className="flex items-start gap-3 p-4 mt-6 transition-colors border cursor-pointer border-gray-200 rounded-2xl hover:border-gray-300 has-[:checked]:border-[#FF2D55] has-[:checked]:bg-[#FF2D55]/5">
                            <input type="checkbox" checked={data.is_public}
                                onChange={(e) => setData('is_public', e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF2D55] focus:ring-[#FF2D55]" />
                            <span>
                                <span className="block text-sm font-bold text-gray-800">Tampilkan di portofolio publik</span>
                                <span className="block mt-0.5 text-xs text-gray-500">Event muncul di halaman depan untuk calon klien.</span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <Link href={route(dariPipeline ? routes.pipeline : routes.index)}
                        className="px-8 py-3 font-bold text-gray-600 transition-all border border-gray-300 rounded-full hover:bg-gray-50">
                        Batal
                    </Link>
                    <button type="submit" disabled={processing}
                        className="inline-flex items-center gap-2 px-10 py-3 bg-[#FF2D55] text-white rounded-full font-bold shadow-lg shadow-red-200 hover:bg-[#e02249] transition-all disabled:opacity-60">
                        <Save size={17} /> {processing ? 'Menyimpan…' : 'Simpan Detail'}
                    </button>
                </div>
            </form>
            )}
        </Layout>
    );
}
