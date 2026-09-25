/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        'brand-blue': {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        surface: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
        },
        border: {
          subtle: '#E2E8F0',
          strong: '#CBD5E1',
        },
        rmi: {
          awal: '#EF4444',
          berkembang: '#F59E0B',
          baik: '#3B82F6',
          lebihbaik: '#6366F1',
          terbaik: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
