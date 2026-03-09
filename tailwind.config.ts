import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sigma: {
          bg: '#121212',
          surface: '#1A1A1A',
          'surface-2': '#141414',
          'surface-hover': '#222222',
          border: 'rgba(255,255,255,0.05)',
          'border-bright': 'rgba(255,255,255,0.1)',
          brand: '#FF3B45',
          'brand-dim': '#cc2f38',
          'brand-glow': 'rgba(255,59,69,0.3)',
          green: '#22c55e',
          'green-dim': '#16a34a',
          'green-glow': 'rgba(34,197,94,0.15)',
          red: '#FF3B45',
          'red-dim': '#cc2f38',
          amber: '#f59e0b',
          text: '#FFFFFF',
          'text-dim': '#828282',
          'text-muted': '#555555',
        },
      },
      backgroundImage: {
        'sigma-gradient': 'linear-gradient(135deg, #121212 0%, #141414 50%, #121212 100%)',
        'card-gradient': 'linear-gradient(180deg, #1A1A1A 0%, #141414 100%)',
        'brand-gradient': 'linear-gradient(135deg, rgba(255,59,69,0.1) 0%, rgba(255,59,69,0.03) 100%)',
      },
      boxShadow: {
        'card': '0 20px 40px rgba(0,0,0,0.6)',
        'card-hover': '0 24px 48px rgba(0,0,0,0.7)',
        'glow': '0 0 20px rgba(255,59,69,0.2)',
        'glow-strong': '0 0 40px rgba(255,59,69,0.35)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'btn-tactile': 'inset 0 1px 0 rgba(255,255,255,0.2)',
        'btn-glow': '0 0 15px rgba(255,59,69,0.3)',
      },
      borderRadius: {
        'card': '14px',
        'btn': '10px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    // No-scrollbar utility
    function ({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.no-scrollbar::-webkit-scrollbar': {
          display: 'none',
        },
      })
    },
  ],
};
export default config;
