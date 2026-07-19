import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';

/**
 * Hitung mundur menuju hari acara.
 *
 * Berhenti sendiri begitu acara lewat, dan tidak menjalankan timer sama sekali
 * bila tanggalnya kosong atau sudah berlalu — supaya halaman yang penuh kartu
 * event tidak menyalakan puluhan interval sekaligus.
 */
function sisaWaktu(target) {
    const selisih = new Date(target).getTime() - Date.now();
    if (Number.isNaN(selisih)) return null;
    if (selisih <= 0) return { lewat: true };

    return {
        lewat: false,
        hari:  Math.floor(selisih / 86400000),
        jam:   Math.floor((selisih / 3600000) % 24),
        menit: Math.floor((selisih / 60000) % 60),
        detik: Math.floor((selisih / 1000) % 60),
    };
}

export default function Countdown({ target, jam = null, ringkas = false, className = '' }) {
    // Jam acara ikut diperhitungkan bila ada, supaya hitungannya tidak
    // melompat ke nol sejak tengah malam di hari-H.
    const waktu = target ? `${String(target).slice(0, 10)}T${(jam || '00:00').slice(0, 5)}` : null;

    const [sisa, setSisa] = useState(() => (waktu ? sisaWaktu(waktu) : null));

    useEffect(() => {
        if (!waktu) return undefined;

        setSisa(sisaWaktu(waktu));
        const t = setInterval(() => {
            const s = sisaWaktu(waktu);
            setSisa(s);
            if (!s || s.lewat) clearInterval(t);
        }, 1000);

        return () => clearInterval(t);
    }, [waktu]);

    if (!sisa) return null;

    if (sisa.lewat) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold text-gray-400 ${className}`}>
                <CalendarClock size={15} /> Hari acara sudah lewat
            </span>
        );
    }

    if (ringkas) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2D55] ${className}`}>
                <CalendarClock size={13} />
                {sisa.hari > 0 ? `${sisa.hari} hari lagi` : `${sisa.jam} jam ${sisa.menit} menit lagi`}
            </span>
        );
    }

    const kotak = [
        ['Hari', sisa.hari],
        ['Jam', sisa.jam],
        ['Menit', sisa.menit],
        ['Detik', sisa.detik],
    ];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {kotak.map(([label, nilai]) => (
                <div key={label} className="px-3 py-2 text-center bg-white border border-gray-100 shadow-sm rounded-xl min-w-[58px]">
                    <div className="text-xl font-extrabold tabular-nums text-gray-900">{String(nilai).padStart(2, '0')}</div>
                    <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</div>
                </div>
            ))}
        </div>
    );
}
