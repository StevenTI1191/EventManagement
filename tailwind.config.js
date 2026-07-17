import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                // Portal klien memakai design system Office (laksamana.css):
                // body = Inter, judul = Plus Jakarta Sans.
                inter: ['Inter', ...defaultTheme.fontFamily.sans],
                display: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            // Token warna Laksamana Muda Office — dipakai portal klien agar
            // seragam dengan office.laksamanamuda.id.
            colors: {
                ink:     { DEFAULT: '#2A2620', 2: '#3A3428', 3: '#4A4234' },
                gold:    { DEFAULT: '#A9791F', 2: '#C8961F', dim: '#7A560F', soft: '#F2E9D3' },
                paper:   '#F7F6F4',
                surface: '#FFFFFF',
                line:    '#E7E1D3',
                muted:   { DEFAULT: '#5C574D', 2: '#928C80' },
                ok:      { DEFAULT: '#1F9D5F', bg: '#E4F5EC' },
                warn:    { DEFAULT: '#B5831A', bg: '#F7EFDB' },
                danger:  { DEFAULT: '#C9432B', bg: '#F8E4DF' },
                info:    { DEFAULT: '#2F7FC4', bg: '#E4EFF8' },
            },
            boxShadow: {
                lm:      '0 4px 18px rgba(50,42,28,.06)',
                'lm-lg': '0 18px 48px rgba(50,42,28,.12)',
                gold:    '0 3px 12px rgba(122,86,15,.28)',
            },
            borderRadius: {
                lm:      '16px',
                'lm-sm': '10px',
            },
            backgroundImage: {
                // Semburat emas halus di atas halaman, sama seperti body laksamana.css.
                'paper-glow': 'radial-gradient(900px 480px at 50% -12%, rgba(227,160,8,.09), transparent 60%)',
                'gold-grad':  'linear-gradient(135deg, #C8961F, #7A560F)',
            },
        },
    },

    plugins: [forms],
};
