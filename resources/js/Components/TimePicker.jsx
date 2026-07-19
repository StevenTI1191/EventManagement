import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * Pemilih jam berbentuk muka jam dinding, format 24 jam.
 *
 * Lingkaran luar 1–12, lingkaran dalam 13–24 (00). Menit dipilih per 5 menit
 * lewat muka jam; angka bebas tetap bisa diketik langsung di kolom atas.
 * Dipakai untuk jam mulai/selesai acara, technical meeting, dan gladi resik.
 */

const JAM_LUAR  = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const JAM_DALAM = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MENIT     = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const PUSAT = 112;
const R_LUAR = 84;
const R_DALAM = 54;

/** Posisi angka ke-i (dari 12 posisi) pada radius tertentu. */
function titik(i, radius) {
    const sudut = (i * 30 - 90) * (Math.PI / 180);
    return { x: PUSAT + radius * Math.cos(sudut), y: PUSAT + radius * Math.sin(sudut) };
}

const dua = (n) => String(n).padStart(2, '0');

function pecah(value) {
    const cocok = /^(\d{1,2}):(\d{1,2})/.exec(String(value || ''));
    if (!cocok) return { jam: null, menit: null };
    const jam = Math.min(23, parseInt(cocok[1], 10));
    const menit = Math.min(59, parseInt(cocok[2], 10));
    return { jam, menit };
}

export default function TimePicker({ value, onChange, placeholder = '--:--', className = '', disabled = false }) {
    const { jam, menit } = pecah(value);

    const [buka, setBuka] = useState(false);
    const [mode, setMode] = useState('jam'); // 'jam' | 'menit'
    const [ketik, setKetik] = useState('');
    const wadah = useRef(null);

    // Tutup saat klik di luar — popover ini melayang di atas form.
    useEffect(() => {
        if (!buka) return undefined;
        const luar = (e) => { if (wadah.current && !wadah.current.contains(e.target)) setBuka(false); };
        document.addEventListener('mousedown', luar);
        return () => document.removeEventListener('mousedown', luar);
    }, [buka]);

    const set = (j, m) => onChange(`${dua(j ?? 0)}:${dua(m ?? 0)}`);

    const pilihJam = (j) => { set(j, menit ?? 0); setMode('menit'); };
    const pilihMenit = (m) => { set(jam ?? 0, m); setBuka(false); setMode('jam'); };

    // Ketikan bebas: terima 1930, 19:30, 19.30 → 19:30
    const terapkanKetik = (teks) => {
        const angka = teks.replace(/\D/g, '').slice(0, 4);
        if (angka.length < 3) return;
        const j = Math.min(23, parseInt(angka.slice(0, angka.length - 2), 10));
        const m = Math.min(59, parseInt(angka.slice(-2), 10));
        set(j, m);
    };

    const aktifJam = mode === 'jam';
    const terpilih = aktifJam ? jam : menit;

    // Jarum menunjuk pilihan aktif.
    const indexJarum = aktifJam
        ? (jam == null ? null : (jam % 12))
        : (menit == null ? null : Math.round(menit / 5) % 12);
    const dalam = aktifJam && jam != null && (jam === 0 || jam >= 13);
    const ujung = indexJarum == null ? null : titik(indexJarum, dalam ? R_DALAM : R_LUAR);

    return (
        <div className={`relative ${className}`} ref={wadah}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => { setBuka((b) => !b); setMode('jam'); setKetik(''); }}
                className="flex items-center justify-between w-full p-3 text-left border border-gray-200 rounded-xl bg-gray-50 hover:border-gray-300 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none disabled:opacity-60"
            >
                <span className={value ? 'font-semibold text-gray-800' : 'text-gray-400'}>
                    {value ? `${dua(jam ?? 0)}:${dua(menit ?? 0)}` : placeholder}
                </span>
                <Clock size={16} className="text-gray-400" />
            </button>

            {buka && (
                <div className="absolute z-40 p-4 mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl w-[264px]">
                    {/* Jam & menit — diklik untuk berpindah mode, atau diketik langsung */}
                    <div className="flex items-center justify-center gap-1 mb-3">
                        <button type="button" onClick={() => setMode('jam')}
                            className={`px-3 py-1.5 text-2xl font-extrabold rounded-lg tabular-nums ${aktifJam ? 'bg-pink-50 text-[#FF2D55]' : 'text-gray-400 hover:bg-gray-50'}`}>
                            {dua(jam ?? 0)}
                        </button>
                        <span className="text-2xl font-extrabold text-gray-300">:</span>
                        <button type="button" onClick={() => setMode('menit')}
                            className={`px-3 py-1.5 text-2xl font-extrabold rounded-lg tabular-nums ${!aktifJam ? 'bg-pink-50 text-[#FF2D55]' : 'text-gray-400 hover:bg-gray-50'}`}>
                            {dua(menit ?? 0)}
                        </button>
                    </div>

                    <svg viewBox="0 0 224 224" className="w-full select-none">
                        <circle cx={PUSAT} cy={PUSAT} r={104} className="fill-gray-50" />

                        {/* Jarum ke angka yang sedang dipilih */}
                        {ujung && (
                            <>
                                <line x1={PUSAT} y1={PUSAT} x2={ujung.x} y2={ujung.y} stroke="#FF2D55" strokeWidth="2" />
                                <circle cx={ujung.x} cy={ujung.y} r="16" fill="#FF2D55" opacity="0.15" />
                            </>
                        )}
                        <circle cx={PUSAT} cy={PUSAT} r="3" fill="#FF2D55" />

                        {aktifJam ? (
                            <>
                                {JAM_LUAR.map((j, i) => {
                                    const p = titik(i, R_LUAR);
                                    const on = jam === j;
                                    return (
                                        <g key={`l${j}`} onClick={() => pilihJam(j)} className="cursor-pointer">
                                            <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                                            <text x={p.x} y={p.y + 5} textAnchor="middle"
                                                className={`text-[15px] font-bold ${on ? 'fill-[#FF2D55]' : 'fill-gray-700'}`}>
                                                {dua(j)}
                                            </text>
                                        </g>
                                    );
                                })}
                                {JAM_DALAM.map((j, i) => {
                                    const p = titik(i, R_DALAM);
                                    const on = jam === j;
                                    return (
                                        <g key={`d${j}`} onClick={() => pilihJam(j)} className="cursor-pointer">
                                            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                                            <text x={p.x} y={p.y + 4} textAnchor="middle"
                                                className={`text-[12px] font-bold ${on ? 'fill-[#FF2D55]' : 'fill-gray-400'}`}>
                                                {dua(j)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </>
                        ) : (
                            MENIT.map((m, i) => {
                                const p = titik(i, R_LUAR);
                                const on = Math.round((menit ?? 0) / 5) * 5 % 60 === m;
                                return (
                                    <g key={m} onClick={() => pilihMenit(m)} className="cursor-pointer">
                                        <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                                        <text x={p.x} y={p.y + 5} textAnchor="middle"
                                            className={`text-[15px] font-bold ${on ? 'fill-[#FF2D55]' : 'fill-gray-700'}`}>
                                            {dua(m)}
                                        </text>
                                    </g>
                                );
                            })
                        )}
                    </svg>

                    <div className="flex items-center gap-2 mt-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ketik cepat, mis. 1930"
                            value={ketik}
                            onChange={(e) => { setKetik(e.target.value); terapkanKetik(e.target.value); }}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none"
                        />
                        <button type="button" onClick={() => { setBuka(false); setMode('jam'); }}
                            className="px-4 py-2 text-sm font-bold text-white bg-[#FF2D55] rounded-lg hover:bg-[#e02249]">
                            Selesai
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
