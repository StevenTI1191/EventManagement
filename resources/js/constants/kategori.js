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
 * Placeholder poster acara — dipakai saat sebuah event belum punya poster.
 * Sebelumnya kartu memakai foto konser dari Unsplash yang menyesatkan (mis.
 * acara ulang tahun tampil foto konser). Sekarang memakai gambar netral
 * berlabel "Belum ada poster" dalam bentuk SVG data-URI (tanpa aset eksternal).
 */
export const POSTER_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 500'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#fff0f3'/><stop offset='1' stop-color='#ffe0e7'/>" +
    "</linearGradient></defs>" +
    "<rect width='700' height='500' fill='url(#g)'/>" +
    "<g fill='none' stroke='#ff2d55' stroke-opacity='0.4' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='276' y='176' width='148' height='114' rx='14'/>" +
    "<circle cx='316' cy='214' r='14'/>" +
    "<path d='M286 276 l40 -42 30 26 26 -22 36 38'/></g>" +
    "<text x='350' y='340' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' " +
    "font-size='23' font-weight='700' fill='#ff2d55' fill-opacity='0.55'>Belum ada poster</text>" +
    "</svg>"
);

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
