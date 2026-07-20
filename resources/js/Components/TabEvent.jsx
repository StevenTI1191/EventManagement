import { Link } from '@inertiajs/react';
import { CalendarRange, History, LayoutList } from 'lucide-react';

/**
 * Tiga pintu masuk menu Event, dipakai sama di Manajemen, Event Marketing,
 * dan Finance:
 *
 *  - Sedang Berjalan : acara yang sudah pasti terjadi (Upcoming ke atas)
 *  - Riwayat         : acara yang sudah dijalankan, target vs hasilnya
 *  - Semua Event     : seluruh siklus Lead sampai Done dalam satu tabel
 *
 * Dipisah jadi komponen agar ketiga peran tidak lagi punya susunan tab
 * sendiri-sendiri yang bisa melenceng.
 */
const TAB = [
    { key: 'berjalan', label: 'Sedang Berjalan', icon: CalendarRange, rute: 'index' },
    { key: 'riwayat',  label: 'Riwayat',         icon: History,      rute: 'riwayat' },
    { key: 'semua',    label: 'Semua Event',     icon: LayoutList,   rute: 'semua' },
];

export default function TabEvent({ aktif, prefix, jumlah = {} }) {
    return (
        <div className="flex flex-wrap gap-2 mb-6">
            {TAB.map((t) => {
                const on = aktif === t.key;
                const Icon = t.icon;
                const isi = (
                    <>
                        <Icon size={15} />
                        {t.label}
                        {jumlah[t.key] != null && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${on ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                                {jumlah[t.key]}
                            </span>
                        )}
                    </>
                );

                const kelas = `flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                    on
                        ? 'bg-[#FF2D55] text-white border-[#FF2D55] shadow-md shadow-[#FF2D55]/20'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`;

                return on
                    ? <span key={t.key} className={kelas}>{isi}</span>
                    : <Link key={t.key} href={route(`${prefix}.event.${t.rute}`)} className={kelas}>{isi}</Link>;
            })}
        </div>
    );
}
