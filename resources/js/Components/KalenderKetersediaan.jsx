import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * Kalender pemilih tanggal meeting yang langsung menunjukkan hari mana yang
 * masih longgar.
 *
 * Sebelumnya klien memakai input tanggal bawaan browser: harus menebak tanggal
 * dulu, baru tahu jamnya penuh atau tidak, lalu mengulang dari awal. Di sini
 * tiap tanggal sudah membawa sisa slotnya, jadi pilihannya sekali jalan.
 *
 * Aturan yang ditampilkan sama persis dengan yang divalidasi server: Minggu
 * libur, hanya tanggal setelah hari ini, dan slot yang sudah dipesan tidak
 * bisa dipilih.
 */

const NAMA_HARI  = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const kunci = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function KalenderKetersediaan({ value, onChange, totalSlot = 16 }) {
    const hariIni = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    const [lihat, setLihat] = useState(() => {
        const d = value ? new Date(value) : new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [terpakai, setTerpakai] = useState({});
    const [total, setTotal] = useState(totalSlot);
    const [memuat, setMemuat] = useState(false);

    const bulanKunci = `${lihat.getFullYear()}-${String(lihat.getMonth() + 1).padStart(2, '0')}`;

    useEffect(() => {
        let batal = false;
        setMemuat(true);

        fetch(`/appointment/ketersediaan?bulan=${bulanKunci}`, { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => {
                if (batal) return;
                setTerpakai(d.terpakai || {});
                if (d.total) setTotal(d.total);
            })
            // Gagal memuat bukan alasan mengunci form — kalender tetap bisa
            // dipakai, hanya tanpa penanda sisa slot. Server tetap memvalidasi.
            .catch(() => { if (! batal) setTerpakai({}); })
            .finally(() => { if (! batal) setMemuat(false); });

        return () => { batal = true; };
    }, [bulanKunci]);

    const sel = useMemo(() => {
        const awal = new Date(lihat.getFullYear(), lihat.getMonth(), 1);
        const jumlahHari = new Date(lihat.getFullYear(), lihat.getMonth() + 1, 0).getDate();
        const kosongAwal = awal.getDay();

        const hasil = Array.from({ length: kosongAwal }, () => null);
        for (let t = 1; t <= jumlahHari; t++) {
            hasil.push(new Date(lihat.getFullYear(), lihat.getMonth(), t));
        }
        return hasil;
    }, [lihat]);

    const keadaan = (d) => {
        if (! d) return null;
        if (d.getDay() === 0) return { bisa: false, label: 'Libur' };
        if (d <= hariIni)     return { bisa: false, label: null };

        const sisa = total - (terpakai[kunci(d)] || 0);
        if (sisa <= 0) return { bisa: false, label: 'Penuh' };

        return { bisa: true, sisa, penuhSebagian: sisa <= 3 };
    };

    const gantiBulan = (arah) => setLihat(new Date(lihat.getFullYear(), lihat.getMonth() + arah, 1));

    // Bulan sebelum bulan berjalan tidak ada gunanya dibuka.
    const bolehMundur = lihat > new Date(hariIni.getFullYear(), hariIni.getMonth(), 1);

    return (
        <div className="p-4 border bg-surface border-line rounded-2xl">
            <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => gantiBulan(-1)} disabled={! bolehMundur}
                    className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg text-muted hover:bg-paper disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={16} />
                </button>
                <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                    {NAMA_BULAN[lihat.getMonth()]} {lihat.getFullYear()}
                    {memuat && <Loader2 size={13} className="animate-spin text-gold" />}
                </p>
                <button type="button" onClick={() => gantiBulan(1)}
                    className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg text-muted hover:bg-paper">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
                {NAMA_HARI.map((h) => (
                    <div key={h} className="py-1 text-[10px] font-bold text-center uppercase text-muted-2">{h}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {sel.map((d, i) => {
                    if (! d) return <div key={`k${i}`} />;

                    const k  = kunci(d);
                    const st = keadaan(d);
                    const dipilih = value === k;

                    return (
                        <button
                            key={k}
                            type="button"
                            disabled={! st.bisa}
                            onClick={() => onChange(k)}
                            title={st.bisa ? `${st.sisa} slot tersedia` : (st.label || 'Tidak tersedia')}
                            className={`relative flex flex-col items-center justify-center h-12 rounded-xl border text-sm font-bold transition-all ${
                                dipilih
                                    ? 'bg-gold-grad text-white border-transparent shadow-gold'
                                    : st.bisa
                                        ? 'bg-paper border-line text-ink hover:border-gold-2'
                                        : 'bg-transparent border-transparent text-muted-2 cursor-not-allowed'
                            }`}
                        >
                            <span>{d.getDate()}</span>
                            {st.bisa && ! dipilih && (
                                <span className={`text-[9px] font-bold ${st.penuhSebagian ? 'text-orange-500' : 'text-ok'}`}>
                                    {st.sisa} slot
                                </span>
                            )}
                            {! st.bisa && st.label && (
                                <span className="text-[9px] font-bold text-muted-2">{st.label}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t border-line">
                {[
                    ['bg-ok', 'Longgar'],
                    ['bg-orange-500', 'Tinggal sedikit'],
                    ['bg-muted-2', 'Penuh / libur'],
                ].map(([warna, teks]) => (
                    <span key={teks} className="flex items-center gap-1.5 text-[10px] text-muted">
                        <span className={`w-2 h-2 rounded-full ${warna}`} /> {teks}
                    </span>
                ))}
            </div>
        </div>
    );
}
