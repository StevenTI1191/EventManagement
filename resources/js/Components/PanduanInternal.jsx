import { useState } from 'react';
import {
    BookOpen, ChevronDown, ShieldAlert, Wallet, CalendarX2, CalendarClock,
} from 'lucide-react';

/**
 * Panduan alur sistem & ketentuan yang berlaku untuk tim internal.
 *
 * Isinya mengikuti perilaku sistem yang sebenarnya, bukan prosedur di luar
 * sistem — supaya tidak ada langkah yang dijelaskan di sini tapi tidak ada
 * tombolnya, atau sebaliknya.
 */

const ALUR = [
    {
        tahap: 'Rencana / Prospek masuk',
        isi: 'Tiga pintu masuk: Planning Event internal (acara milik LM sendiri), Planning Event bertarget klien, '
            + 'dan prospek dari klien — baik yang mengajukan sendiri lewat portal maupun yang di-input tim lewat Prospek Baru.',
    },
    {
        tahap: 'Lead',
        isi: 'Semua prospek klien mendarat di sini. Buka kartunya untuk melengkapi jam mulai, jam selesai, area, '
            + 'jumlah pax, dan deal harga. Selama lima isian itu belum lengkap, kartunya belum boleh naik tahap.',
    },
    {
        tahap: 'Negotiation',
        isi: 'Menggeser kartu ke sini berarti MENGAJUKAN penawaran, bukan mengirimkannya. Penawaran masuk ke '
            + 'Pihak Manajemen lebih dulu; dokumen PDF baru tersusun dan terkirim ke email serta portal klien '
            + 'pada saat disetujui. Bila ditolak, tahapnya tidak turun — perbaiki lalu ajukan lagi dari papan Pipeline.',
    },
    {
        tahap: 'Negosiasi lanjutan (bila ada)',
        isi: 'Klien boleh meminta penyesuaian tanpa menolak penawaran. Permintaannya masuk ke menu Negosiasi Lanjutan '
            + 'untuk dibalas, dan bila perlu dijadwalkan pertemuan. Penawaran hasil pembahasan tidak bisa langsung '
            + 'dikirim — ajukan sebagai revisi dan Manajemen menyetujuinya sekali lagi.',
    },
    {
        tahap: 'Deal',
        isi: 'Hanya bisa dicapai setelah klien menekan terima di portalnya. Kartu tidak dapat digeser ke Deal secara '
            + 'sepihak, dan setelah Deal tidak dapat ditarik mundur lagi. Invoice uang muka 50% terbit otomatis.',
    },
    {
        tahap: 'Upcoming',
        isi: 'Setelah bukti pembayaran DP diverifikasi Finance, event naik ke Upcoming dan invoice pelunasan terbit. '
            + 'To-do divisi dibuat otomatis sesuai kategori acara, dan technical meeting serta gladi resik masuk kalender.',
    },
    {
        tahap: 'Penyelesaian',
        isi: 'Hari acara sudah lewat tapi masih ada yang belum tuntas — pekerjaan divisi atau pelunasan. '
            + 'Event tetap tampil di papan supaya sisa pekerjaannya tidak hilang.',
    },
    {
        tahap: 'Done',
        isi: 'Semua tuntas. Kartunya masih terlihat di pipeline selama 3 hari, lalu keluar sendiri agar kolom tidak menumpuk.',
    },
];

const PEMBAYARAN = [
    'Uang muka 50% dari nilai kesepakatan, terbit otomatis begitu acara mencapai Deal. Pelunasan 50% sisanya terbit '
        + 'setelah uang muka lunas.',
    'Pelunasan paling lambat 3 hari sebelum hari pelaksanaan. Tanggal jatuh temponya dihitung sendiri oleh sistem '
        + 'dari tanggal acara.',
    'Tidak ada cicilan. Setiap tagihan dibayar penuh dalam satu kali transfer. Bukti yang nominalnya kurang tetap '
        + 'diterima tetapi ditandai pada halaman verifikasi, dan Finance yang memutuskan — sebab yang tertulis pada '
        + 'formulir belum tentu sama dengan yang benar-benar ditransfer.',
    'Bukti pembayaran selalu diverifikasi Finance. Pembacaan nominal otomatis hanya membantu menyaring, tidak pernah '
        + 'meloloskan pembayaran sendiri.',
    'Bukti pembayaran menempel pada invoice tertentu, jadi pastikan klien memilih tagihan yang benar saat mengunggah.',
];

const PEMBATALAN = [
    'Klien membatalkan acara sendiri dari portalnya, selama acaranya belum berlangsung (Deal atau Upcoming). '
        + 'Pembatalan berlaku seketika tanpa persetujuan, dan UANG MUKA YANG SUDAH DIBAYARKAN HANGUS. Klien wajib '
        + 'mencentang pernyataan bahwa ia memahaminya lebih dulu.',
    'Sebagai gantinya klien dapat meminta acaranya dipindahkan ke tanggal lain. Uang mukanya tetap berlaku, '
        + 'tidak hangus.',
    'Permintaan ganti tanggal menunggu persetujuan Pihak Manajemen, dan hanya satu permintaan yang aktif per acara. '
        + 'Ketersediaan tanggal tujuan diperiksa ulang saat disetujui.',
    'Pembatalan menandai acara berstatus Batal, menghapus tagihan yang belum dibayar, dan melepas jadwalnya agar '
        + 'slot itu bisa dipakai lagi. Acara yang sudah berlangsung (Penyelesaian atau Done) tidak dapat dibatalkan, '
        + 'sebab jasanya sudah dikerjakan dan sisa tagihannya tetap harus dilunasi.',
];

const JADWAL = [
    'Dua acara tidak boleh bertabrakan pada area yang sama. Rentang yang dianggap terpakai dihitung dari loading in '
        + 'sampai loading out — bukan dari jam acara — sehingga waktu bongkar pasang ikut terhitung.',
    'Bila loading in dan loading out belum diisi, jam mulai dan jam selesai acara dipakai sebagai gantinya.',
    'Di kedua ujung rentang itu berlaku jeda wajib 1 jam. Acara berstatus Done dan Batal tidak lagi memblokir slot.',
    'Slot appointment 09:00–16:30 berjarak 1,5 jam, hari Minggu libur. Satu slot hanya untuk satu klien, dan slot '
        + 'yang sudah terisi otomatis nonaktif pada pemilih jadwal klien.',
    'Appointment yang lahir dari negosiasi lanjutan tidak muncul di halaman Appointment biasa, agar tidak tercampur '
        + 'dengan permintaan meeting reguler.',
];

const KETENTUAN = [
    'Perpindahan tahap hanya lewat papan Pipeline. Menyimpan form detail tidak akan mengubah status — ini disengaja, '
        + 'supaya event tidak tercabut dari alurnya tanpa sadar.',
    'Event tidak bisa naik ke Negotiation atau Deal sebelum jam, area, jumlah pax, dan deal harga terisi. '
        + 'Daftar yang masih kosong tampil di halaman detail event.',
    'Acara yang sudah Deal tidak dapat dikembalikan ke tahap sebelumnya. Bila acaranya memang batal, gunakan tombol '
        + '"Tidak jadi", bukan menggeser kartunya kembali.',
    'Event internal tidak masuk pipeline dan tidak menagih klien. Rencana bertarget klien baru muncul di papan To-Do '
        + 'setelah benar-benar jadi dan berstatus Upcoming.',
];

/** Satu kelompok ketentuan: judul berikon + daftar butirnya. */
const Bagian = ({ ikon: Ikon, judul, butir }) => (
    <div className="mt-6 first:mt-0">
        <p className="flex items-center gap-1.5 mb-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            <Ikon size={12} /> {judul}
        </p>
        <ul className="space-y-2">
            {butir.map((b, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                    <span className="text-[#FF2D55] font-black shrink-0">•</span>
                    <span>{b}</span>
                </li>
            ))}
        </ul>
    </div>
);

export default function PanduanInternal({ posisi }) {
    const [buka, setBuka] = useState(false);

    const peran = {
        'Event Marketing': 'Kamu memegang prospek: melengkapi detail, mengajukan penawaran ke Manajemen, menanggapi negosiasi lanjutan, mencatat follow-up, dan menggeser kartu di pipeline.',
        EventMarketing:    'Kamu memegang prospek: melengkapi detail, mengajukan penawaran ke Manajemen, menanggapi negosiasi lanjutan, mencatat follow-up, dan menggeser kartu di pipeline.',
        Finance:           'Kamu memegang tagihan: memantau invoice yang terbit otomatis, memverifikasi bukti pembayaran, dan mencatat transaksi.',
        Manajemen:         'Kamu memutuskan dan memantau: menyetujui penawaran serta permintaan ganti tanggal, lalu memantau pipeline, jadwal, dan evaluasi kinerja.',
    }[posisi];

    return (
        <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
            <button type="button" onClick={() => setBuka((b) => !b)}
                className="flex items-center w-full gap-3 px-6 py-4 text-left hover:bg-gray-50">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-pink-50 text-[#FF2D55] shrink-0">
                    <BookOpen size={15} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-gray-800">Panduan Alur & Ketentuan Sistem</p>
                    <p className="text-xs text-gray-400">Cara kerja sistem dari prospek sampai event selesai.</p>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${buka ? 'rotate-180' : ''}`} />
            </button>

            {buka && (
                <div className="px-6 pb-6">
                    {peran && (
                        <p className="p-3 mb-5 text-xs font-semibold text-[#FF2D55] bg-pink-50 rounded-xl">{peran}</p>
                    )}

                    <p className="mb-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Alur Event</p>
                    <ol className="mb-6 space-y-3">
                        {ALUR.map((a, i) => (
                            <li key={a.tahap} className="flex gap-3">
                                <span className="flex items-center justify-center w-6 h-6 text-[10px] font-black text-white bg-[#FF2D55] rounded-full shrink-0">
                                    {i + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{a.tahap}</p>
                                    <p className="text-xs leading-relaxed text-gray-500">{a.isi}</p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <Bagian ikon={Wallet} judul="Aturan Pembayaran" butir={PEMBAYARAN} />
                    <Bagian ikon={CalendarX2} judul="Pembatalan & Ganti Tanggal" butir={PEMBATALAN} />
                    <Bagian ikon={CalendarClock} judul="Bentrok Jadwal & Slot Meeting" butir={JADWAL} />
                    <Bagian ikon={ShieldAlert} judul="Ketentuan Lain" butir={KETENTUAN} />
                </div>
            )}
        </div>
    );
}
