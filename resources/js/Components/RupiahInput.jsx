// Input angka dengan format Rupiah (titik ribuan otomatis) + prefix "Rp".
// Menyimpan nilai numeric murni (Number) ke form, menampilkan terformat.
//
// Pakai:
//   <RupiahInput value={data.nominal} onChange={v => setData('nominal', v)} className="..." />
export default function RupiahInput({ value, onChange, className = '', placeholder = '0', ...props }) {
    const display =
        value !== '' && value !== null && value !== undefined && !isNaN(value)
            ? new Intl.NumberFormat('id-ID').format(value)
            : '';

    const handle = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        onChange(raw ? Number(raw) : '');
    };

    return (
        <div className="relative">
            <span className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-sm text-gray-500">Rp</span>
            <input
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={display}
                onChange={handle}
                className={`${className} pl-9`}
                {...props}
            />
        </div>
    );
}
