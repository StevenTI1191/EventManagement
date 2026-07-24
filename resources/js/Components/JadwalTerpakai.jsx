import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';

/**
 * Menampilkan jadwal yang sudah terpakai pada area & tanggal terpilih, langsung
 * saat form diisi (tanpa menunggu tombol simpan). Memberi tahu jam mana yang
 * bentrok agar pengguna memilih waktu yang tidak berbenturan.
 */
export default function JadwalTerpakai({ area, tgl, exclude }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!area || !tgl) { setList([]); return undefined; }
        const c = new AbortController();
        setLoading(true);
        const url = `/backstage/jadwal-terpakai?area=${encodeURIComponent(area)}&tgl=${tgl}${exclude ? `&exclude=${exclude}` : ''}`;
        fetch(url, { headers: { Accept: 'application/json' }, signal: c.signal })
            .then((r) => r.json())
            .then((d) => setList(d.terpakai || []))
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => c.abort();
    }, [area, tgl, exclude]);

    if (!area || !tgl) return null;

    return (
        <div className={`p-3 text-xs border rounded-xl ${list.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`flex items-center gap-1.5 font-bold ${list.length ? 'text-amber-800' : 'text-emerald-800'}`}>
                <CalendarClock size={13} /> Jadwal terpakai di {area} — {tgl}
            </p>
            {loading ? (
                <p className="mt-1 text-gray-500">Memeriksa…</p>
            ) : list.length === 0 ? (
                <p className="mt-1 text-emerald-700">Area kosong pada tanggal ini. Aman dijadwalkan.</p>
            ) : (
                <ul className="mt-1 space-y-0.5 text-amber-800">
                    {list.map((e, i) => (
                        <li key={i}>• <span className="font-bold">{e.mulai}–{e.selesai}</span> — {e.nama}{e.pakai_loading ? ' (loading in–out)' : ''}</li>
                    ))}
                    <li className="pt-1 text-[10px] text-amber-600">Pilih waktu di luar rentang di atas dan beri jeda minimal 1 jam.</li>
                </ul>
            )}
        </div>
    );
}
