import { Trash2 } from 'lucide-react';

/**
 * Dialog konfirmasi penghapusan, seragam untuk seluruh sistem.
 *
 * Bahasa visualnya mengikuti dialog hapus klien & hapus acara yang sudah lebih
 * dulu ada: lingkaran merah, judul pertanyaan, nama barang yang dihapus, lalu
 * penegasan bahwa tindakannya tidak dapat dibatalkan.
 *
 * Dibuat karena beberapa penghapusan sebelumnya menembak langsung dari ikon
 * tong sampah tanpa penegasan apa pun — satu salah tekan sudah cukup untuk
 * menghilangkan data beserta berkas fisiknya.
 *
 * @param {boolean}  buka      dialog ditampilkan
 * @param {string}   judul     pertanyaannya, mis. "Hapus Foto Dokumentasi?"
 * @param {string}   [nama]    nama barang yang dihapus, ditebalkan
 * @param {string}   [catatan] keterangan tambahan di bawah nama
 * @param {boolean}  [proses]  sedang mengirim, tombolnya dinonaktifkan
 * @param {Function} onBatal
 * @param {Function} onHapus
 */
export default function KonfirmasiHapus({
    buka, judul, nama, catatan, proses = false, onBatal, onHapus,
}) {
    if (! buka) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => proses || onBatal()}>
            <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl"
                 onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                    <Trash2 size={20} className="text-red-500" />
                </div>

                <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">{judul}</h2>

                {nama && (
                    <p className="mb-1 text-sm font-bold text-center text-gray-700 break-words">{nama}</p>
                )}

                <p className="mb-5 text-xs text-center text-gray-400">
                    {catatan || 'Tindakan ini tidak bisa dibatalkan.'}
                </p>

                <div className="flex gap-3">
                    <button type="button" onClick={onBatal} disabled={proses}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-60">
                        Batal
                    </button>
                    <button type="button" onClick={onHapus} disabled={proses}
                        className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                        {proses ? 'Menghapus…' : 'Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}
