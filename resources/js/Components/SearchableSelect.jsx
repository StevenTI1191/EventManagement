import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Dropdown dengan pencarian — untuk daftar panjang seperti klien atau pegawai,
 * supaya tidak perlu scroll satu per satu.
 *
 * options: [{ value, label, sub? }]
 */
export default function SearchableSelect({
    options = [],
    value = '',
    onChange,
    placeholder = 'Pilih…',
    searchPlaceholder = 'Ketik untuk mencari…',
    emptyOption = null,      // mis. '— Tanpa klien —'; null = wajib pilih
    className = '',
}) {
    const [buka, setBuka] = useState(false);
    const [cari, setCari] = useState('');
    const wadahRef = useRef(null);
    const cariRef  = useRef(null);

    const terpilih = useMemo(
        () => options.find((o) => String(o.value) === String(value)) || null,
        [options, value],
    );

    const hasil = useMemo(() => {
        const q = cari.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(q),
        );
    }, [options, cari]);

    // Tutup saat klik di luar
    useEffect(() => {
        const onKlikLuar = (e) => {
            if (wadahRef.current && !wadahRef.current.contains(e.target)) {
                setBuka(false);
                setCari('');
            }
        };
        document.addEventListener('mousedown', onKlikLuar);
        return () => document.removeEventListener('mousedown', onKlikLuar);
    }, []);

    // Fokuskan kolom cari begitu dropdown dibuka
    useEffect(() => {
        if (buka) cariRef.current?.focus();
    }, [buka]);

    const pilih = (val) => {
        onChange?.(val);
        setBuka(false);
        setCari('');
    };

    return (
        <div ref={wadahRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setBuka((b) => !b)}
                className="flex items-center justify-between w-full gap-2 p-3 text-left border border-gray-200 rounded-xl bg-gray-50 hover:border-gray-300 focus:border-[#FF2D55] focus:outline-none"
            >
                <span className={`text-sm truncate ${terpilih ? 'text-gray-800' : 'text-gray-400'}`}>
                    {terpilih ? terpilih.label : (emptyOption && !value ? emptyOption : placeholder)}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${buka ? 'rotate-180' : ''}`} />
            </button>

            {buka && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 shadow-lg rounded-xl">
                    <div className="relative p-2 border-b border-gray-100">
                        <Search size={14} className="absolute -translate-y-1/2 left-4 top-1/2 text-gray-400" />
                        <input
                            ref={cariRef}
                            type="text"
                            value={cari}
                            onChange={(e) => setCari(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full py-2 pl-8 pr-8 text-sm border border-gray-200 rounded-lg focus:border-[#FF2D55] focus:outline-none"
                        />
                        {cari && (
                            <button type="button" onClick={() => setCari('')}
                                className="absolute -translate-y-1/2 right-4 top-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-60">
                        {emptyOption && (
                            <button type="button" onClick={() => pilih('')}
                                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-gray-50 font-bold' : 'text-gray-500'}`}>
                                {emptyOption}
                            </button>
                        )}

                        {hasil.length === 0 ? (
                            <p className="px-3 py-6 text-sm text-center text-gray-400">
                                Tidak ada yang cocok dengan “{cari}”.
                            </p>
                        ) : (
                            hasil.map((o) => {
                                const aktif = String(o.value) === String(value);
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => pilih(o.value)}
                                        className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 ${aktif ? 'bg-[#FF2D55]/5' : ''}`}
                                    >
                                        <span className={`block text-sm truncate ${aktif ? 'font-bold text-[#FF2D55]' : 'text-gray-800'}`}>
                                            {o.label}
                                        </span>
                                        {o.sub && <span className="block text-xs text-gray-400 truncate">{o.sub}</span>}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {options.length > 8 && (
                        <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                            {hasil.length} dari {options.length} pilihan
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
