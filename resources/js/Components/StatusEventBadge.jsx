/**
 * Lencana status event dengan warna yang sama di seluruh sistem.
 *
 * Warnanya mengikuti perjalanan tahap seperti di papan pipeline — abu saat
 * masih calon, menghangat ketika ditawar, hijau begitu disetujui — supaya
 * status yang sama tidak tampil dengan warna berbeda di halaman berbeda.
 */
const WARNA = {
    Planning:     'bg-gray-100 text-gray-600 border-gray-200',
    Lead:         'bg-slate-100 text-slate-700 border-slate-200',
    Negotiation:  'bg-amber-50 text-amber-700 border-amber-200',
    Deal:         'bg-emerald-50 text-emerald-700 border-emerald-200',
    Upcoming:     'bg-blue-50 text-blue-700 border-blue-200',
    Penyelesaian: 'bg-orange-50 text-orange-700 border-orange-200',
    Done:         'bg-gray-100 text-gray-500 border-gray-200',
    Batal:        'bg-red-50 text-red-600 border-red-200',
};

/** Penjelasan singkat, muncul saat kursor diarahkan. */
const ARTI = {
    Planning:     'Masih rencana, belum diajukan',
    Lead:         'Calon acara — detail belum lengkap',
    Negotiation:  'Penawaran sudah dikirim ke klien',
    Deal:         'Penawaran diterima, menunggu uang muka',
    Upcoming:     'Uang muka lunas, persiapan berjalan',
    Penyelesaian: 'Acara sudah lewat, belum tuntas',
    Done:         'Selesai dan tuntas',
    Batal:        'Dibatalkan',
};

export default function StatusEventBadge({ status, className = '' }) {
    if (! status) return <span className="text-xs text-gray-400">—</span>;

    return (
        <span
            title={ARTI[status] || undefined}
            className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border whitespace-nowrap ${
                WARNA[status] || WARNA.Planning
            } ${className}`}
        >
            {status}
        </span>
    );
}
