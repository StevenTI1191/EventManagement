import TimePicker from '@/Components/TimePicker';

/**
 * Tanggal + jam untuk jadwal yang bisa jatuh di hari berbeda dari acaranya —
 * technical meeting dan gladi resik biasanya H-1.
 *
 * Nilainya tetap "YYYY-MM-DDTHH:MM" persis seperti input datetime-local, supaya
 * sebangun dengan data yang sudah tersimpan.
 */
export default function DateTimePicker({ value, onChange, disabled = false }) {
    const [tgl = '', jam = ''] = String(value || '').split('T');

    const ubah = (tglBaru, jamBaru) => {
        // Tanpa tanggal, jam saja tidak punya arti — nilainya dikosongkan.
        if (! tglBaru) return onChange('');
        onChange(`${tglBaru}T${(jamBaru || '00:00').slice(0, 5)}`);
    };

    return (
        <div className="grid grid-cols-2 gap-2">
            <input
                type="date"
                disabled={disabled}
                value={tgl}
                onChange={(e) => ubah(e.target.value, jam)}
                className="w-full p-3 border-gray-200 rounded-xl bg-gray-50 focus:border-[#FF2D55] focus:ring-1 focus:ring-[#FF2D55] focus:outline-none disabled:opacity-60"
            />
            <TimePicker
                value={jam}
                disabled={disabled || ! tgl}
                onChange={(j) => ubah(tgl, j)}
                placeholder="--:--"
            />
        </div>
    );
}
