// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    // مسیرهای صحیح بر اساس ساختار پروژه شما
    './app/**/*.{js,ts,jsx,tsx,mdx}',        // بدون src/
    './components/**/*.{js,ts,jsx,tsx,mdx}', // بدون src/
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-vazirmatn)', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { textShadow: '0 0 10px rgba(232, 195, 142, 0.3)' },
          '50%': { textShadow: '0 0 25px rgba(232, 195, 142, 0.8)' },
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
export default config;