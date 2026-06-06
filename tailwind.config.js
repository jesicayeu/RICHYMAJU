import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                display: ['Syne', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                },
            },
            boxShadow: {
                brand: '0 8px 28px -6px rgba(99, 102, 241, 0.22)',
                'brand-lg': '0 20px 50px -12px rgba(99, 102, 241, 0.28)',
                'brand-glow': '0 0 40px -8px rgba(99, 102, 241, 0.4), 0 0 80px -24px rgba(6, 182, 212, 0.15)',
                'brand-sm': '0 4px 20px -4px rgba(99, 102, 241, 0.15)',
                'brand-md': '0 10px 40px -10px rgba(99, 102, 241, 0.2)',
                'brand-xl': '0 20px 60px -15px rgba(99, 102, 241, 0.25)',
            },
            animation: {
                'blob': 'blob 8s ease-in-out infinite',
                'blob-slow': 'blob 12s ease-in-out infinite',
                'gradient-x': 'gradient-x 6s ease infinite',
                'float': 'float 5s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'shimmer': 'shimmer 2.5s linear infinite',
                'marquee': 'marquee 28s linear infinite',
                'spin-slow': 'spin 12s linear infinite',
                'grid-drift': 'grid-drift 20s linear infinite',
                'aurora': 'aurora 10s ease-in-out infinite',
                'shadow-breathe': 'shadow-breathe 4s ease-in-out infinite',
                'shadow-breathe-light': 'shadow-breathe-light 4s ease-in-out infinite',
                'shadow-drift': 'shadow-drift 6s ease-in-out infinite',
            },
            keyframes: {
                blob: {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '33%': { transform: 'translate(30px, -40px) scale(1.08)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
                },
                'gradient-x': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
                    '50%': { opacity: '0.85', transform: 'scale(1.05)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'grid-drift': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(60px)' },
                },
                aurora: {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1) rotate(0deg)' },
                    '50%': { opacity: '0.7', transform: 'scale(1.1) rotate(3deg)' },
                },
                'shadow-breathe': {
                    '0%, 100%': {
                        boxShadow: '0 10px 40px -10px rgba(99,102,241,0.2), 0 4px 16px -4px rgba(15,23,42,0.4)',
                    },
                    '50%': {
                        boxShadow: '0 22px 60px -12px rgba(99,102,241,0.38), 0 10px 30px -8px rgba(79,70,229,0.2)',
                    },
                },
                'shadow-breathe-light': {
                    '0%, 100%': {
                        boxShadow: '0 10px 40px -10px rgba(99,102,241,0.18), 0 4px 16px -4px rgba(6,182,212,0.08)',
                    },
                    '50%': {
                        boxShadow: '0 22px 60px -12px rgba(99,102,241,0.35), 0 10px 30px -8px rgba(139,92,246,0.15)',
                    },
                },
                'shadow-drift': {
                    '0%, 100%': { transform: 'translate(0, 0)', opacity: '0.45' },
                    '33%': { transform: 'translate(12px, -18px)', opacity: '0.6' },
                    '66%': { transform: 'translate(-8px, 10px)', opacity: '0.5' },
                },
            },
        },
    },

    plugins: [forms],
};
