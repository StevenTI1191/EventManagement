import '../css/app.css';
import './bootstrap';
// Hapus import manual Ziggy di atas kalau pakai route helper bawaan

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // TAMBAHKAN global.route = route; (Jika pakai ziggy-js)
        // Dan pastikan render-nya seperti ini:
        root.render(<App {...props} />);
    },
    progress: {
        color: '#FF2D55', // Ganti ke merah Laksamana biar keren Ko!
    },
});
