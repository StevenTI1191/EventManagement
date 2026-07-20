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
