import axios from 'axios';
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Hanya inisialisasi Echo jika Reverb dikonfigurasi
// Jika VITE_REVERB_APP_KEY tidak diset, window.Echo = undefined
// dan semua guard "if (typeof window.Echo === 'undefined') return;" akan bekerja
if (import.meta.env.VITE_REVERB_APP_KEY) {
    const { default: Echo } = await import('laravel-echo');
    const { default: Pusher } = await import('pusher-js');
    window.Pusher = Pusher;

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
    });
}
