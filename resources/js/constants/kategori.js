/**
 * Satu daftar kategori acara, dipakai bersama form event internal dan pemilihan
 * jenis acara oleh klien saat appointment.
 *
 * Sebelumnya keduanya punya daftar berbeda (event: Konser/Wedding/Corporate…,
 * appointment: Corporate Event/Music & Concert/Exhibition…), sehingga jenis
 * yang dipilih klien tidak pernah cocok dengan kategori yang bisa dipilih tim
 * saat membuat event. Sekarang satu vocabulary untuk keduanya.
 */
export const KATEGORI_EVENT = [
    { value: 'Corporate',     icon: '🏢', desc: 'Seminar, gathering, konferensi' },
    { value: 'Wedding',       icon: '💍', desc: 'Pernikahan & gala dinner' },
    { value: 'Konser',        icon: '🎵', desc: 'Konser & pertunjukan musik' },
    { value: 'Exhibition',    icon: '🎪', desc: 'Pameran & expo' },
    { value: 'Sports',        icon: '🏆', desc: 'Turnamen & olahraga' },
    { value: 'Seminar',       icon: '🎓', desc: 'Seminar & workshop' },
    { value: 'Birthday',      icon: '🎂', desc: 'Ulang tahun' },
    { value: 'Private Party',  icon: '🎉', desc: 'Acara privat & perayaan' },
    { value: 'Lainnya',       icon: '✨', desc: 'Jenis acara lainnya' },
];

/** Hanya nilai kategorinya — untuk dropdown <select> di form internal. */
export const KATEGORI_VALUES = KATEGORI_EVENT.map((k) => k.value);

/**
 * Asal sebuah acara, penentu apakah ia punya target omset:
 *  - `dari_planning`  → rencana yang disiapkan Laksamana lalu ditawarkan ke
 *    klien, jadi memang mengemban target omset.
 *  - selain itu       → klien yang mendaftar sendiri lewat appointment; Laksamana
 *    tidak "gerak duluan", sehingga acara ini tidak dihitung sebagai target.
 *
 * Dipakai untuk menampilkan penanda seragam di daftar & detail event.
 */
export function asalEvent(event) {
    if (!event) return null;

    if (event.dari_planning) {
        return {
            label: 'Rencana bertarget',
            badge: 'bg-indigo-50 text-indigo-600',
            ket:   'Rencana yang disiapkan Laksamana lalu ditawarkan ke klien.',
        };
    }

    return {
        label: 'Dari appointment klien',
        badge: 'bg-sky-50 text-sky-600',
        ket:   'Klien mendaftar sendiri lewat appointment — bukan target Laksamana.',
    };
}
