/**
 * Shared formatting utilities — used across all roles (Manajemen, Finance, EM, Client).
 * Import only what you need: import { formatRupiah, formatTanggal } from '@/utils/format';
 */

/**
 * Format angka sebagai Rupiah lengkap: Rp 1.500.000
 */
export const formatRupiah = (v) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(v ?? 0);

/**
 * Format angka sebagai Rupiah singkat: Rp 1,5Jt / Rp 2,3M
 */
export const formatRupiahShort = (v) => {
    if (!v) return 'Rp 0';
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}K`;
    return `Rp ${v}`;
};

/**
 * Format tanggal panjang: Senin, 7 Juni 2026
 */
export const formatTanggal = (tgl) => {
    if (!tgl) return '-';
    return new Date(tgl).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Format tanggal pendek: 07 Jun 2026
 */
export const formatTanggalShort = (tgl) => {
    if (!tgl) return '-';
    return new Date(tgl).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Format tanggal + waktu: 07 Jun 2026 14:30
 */
export const formatDateTime = (tgl) => {
    if (!tgl) return '-';
    const d = new Date(tgl);
    return (
        d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    );
};
