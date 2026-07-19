import { useState } from 'react';
import { BookOpen, ChevronDown, ShieldAlert } from 'lucide-react';

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
        isi: 'Penawaran dibuat dan dikirim ke klien (PDF + WhatsApp). Klien melihat penawaran yang sama di portalnya.',
    },
    {
        tahap: 'Deal',
        isi: 'Begitu klien menekan terima di portal, status naik sendiri ke Deal dan tidak bisa dimundurkan lagi. '
            + 'Finance menerbitkan invoice uang muka 50%.',
    },
    {
        tahap: 'Upcoming',
        isi: 'Setelah bukti pembayaran DP diverifikasi Finance, event naik ke Upcoming. To-do divisi dibuat otomatis '
            + 'sesuai kategori acara, dan technical meeting serta gladi resik masuk kalender.',
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

const KETENTUAN = [
    'Perpindahan tahap hanya lewat papan Pipeline. Menyimpan form detail tidak akan mengubah status — ini disengaja, '
        + 'supaya event tidak tercabut dari alurnya tanpa sadar.',
    'Event tidak bisa naik ke Negotiation atau Deal sebelum jam, area, jumlah pax, dan deal harga terisi. '
        + 'Daftar yang masih kosong tampil di halaman detail event.',
    'Penawaran yang sudah diterima klien tidak boleh ditarik mundur. Bila acaranya batal, gunakan tombol "Tidak jadi", '
        + 'bukan menggeser kartunya kembali.',
    'Jadwal tidak boleh bentrok di area yang sama, termasuk jeda 3 jam sebelum dan sesudah acara untuk bongkar pasang.',
    'Bukti pembayaran selalu diverifikasi Finance. Pembacaan otomatis hanya menyaring dan membantu — tidak pernah '
        + 'meloloskan pembayaran sendiri.',
    'Bukti pembayaran menempel pada invoice tertentu, jadi pastikan klien memilih tagihan yang benar saat mengunggah.',
    'Event internal tidak masuk pipeline dan tidak menagih klien. Rencana bertarget klien baru muncul di papan To-Do '
        + 'setelah benar-benar jadi dan berstatus Upcoming.',
];

export default function PanduanInternal({ posisi }) {
    const [buka, setBuka] = useState(false);

    const peran = {
        'Event Marketing': 'Kamu memegang prospek: melengkapi detail, mengirim penawaran, mencatat follow-up, dan menggeser kartu di pipeline.',
        EventMarketing:    'Kamu memegang prospek: melengkapi detail, mengirim penawaran, mencatat follow-up, dan menggeser kartu di pipeline.',
        Finance:           'Kamu memegang tagihan: menerbitkan invoice, memverifikasi bukti pembayaran, dan mencatat transaksi.',
        Manajemen:         'Kamu memantau keseluruhan: pipeline, jadwal, evaluasi kinerja, dan catatan untuk tim.',
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

                    <p className="flex items-center gap-1.5 mb-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                        <ShieldAlert size={12} /> Ketentuan yang Berlaku
                    </p>
                    <ul className="space-y-2">
                        {KETENTUAN.map((k, i) => (
                            <li key={i} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                                <span className="text-[#FF2D55] font-black shrink-0">•</span>
                                <span>{k}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
