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

/**
 * Dua tema: halaman internal (putih–pink) dan portal klien (emas di atas
 * permukaan gelap). Warnanya dipisah di sini supaya pemanggilnya tidak perlu
 * menimpa kelas — urutan kelas Tailwind tidak menjamin penimpaan.
 */
const TEMA = {
    internal: {
        aksen: 'text-[#FF2D55]',
        kotak: 'bg-white border-gray-100 text-gray-900',
        label: 'text-gray-400',
        lewat: 'text-gray-400',
    },
    klien: {
        aksen: 'text-gold',
        kotak: 'bg-paper border-line text-ink',
        label: 'text-muted',
        lewat: 'text-muted',
    },
};

export default function Countdown({ target, jam = null, ringkas = false, tema = 'internal', className = '' }) {
    const t = TEMA[tema] || TEMA.internal;

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
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${t.lewat} ${className}`}>
                <CalendarClock size={15} /> Hari acara sudah lewat
            </span>
        );
    }

    if (ringkas) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${t.aksen} ${className}`}>
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
                <div key={label} className={`px-3 py-2 text-center border shadow-sm rounded-xl min-w-[58px] ${t.kotak}`}>
                    <div className="text-xl font-extrabold tabular-nums">{String(nilai).padStart(2, '0')}</div>
                    <div className={`text-[10px] font-bold tracking-wider uppercase ${t.label}`}>{label}</div>
                </div>
            ))}
        </div>
    );
}
