/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondos y bordes: por variables CSS para que el tema tinte todo el chrome.
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          elev:    'rgb(var(--bg-elev) / <alpha-value>)',
          card:    'rgb(var(--bg-card) / <alpha-value>)',
          soft:    'rgb(var(--bg-soft) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          dim:     'rgb(var(--ink-dim) / <alpha-value>)',
          mute:    'rgb(var(--ink-mute) / <alpha-value>)',
        },
        // Brand: definido por variables CSS para soportar temas de color.
        // Formato canal RGB ("R G B") para que sigan funcionando las opacidades (brand/15).
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft:    'rgb(var(--brand-soft) / <alpha-value>)',
          glow:    'rgb(var(--brand-glow) / <alpha-value>)',
        },
        // Acento secundario: ámbar (para CTAs alternativos, highlights, mesas)
        accent: {
          DEFAULT: '#f0a020',
          soft:    '#5a3d10',
        },
        // Estados del calendario académico (idénticos a la imagen del CET)
        cal: {
          holiday:    '#ef4444', // rojo - feriado
          recess:     '#7dd3fc', // celeste - receso invernal
          mesaStart:  '#ef4444', // gradiente rojo→
          mesaEnd:    '#fbbf24', // ←amarillo (mesa con suspensión)
          milestone:  '#86efac', // verde - inicio/fin cuatrimestre
        },
      },
      fontFamily: {
        // Inter sigue siendo la mejor para UI; agregamos serif para títulos grandes
        sans:  ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft:  '0 6px 24px rgba(0,0,0,0.35)',
        glow:  '0 0 0 1px rgb(var(--brand) / 0.4), 0 8px 28px -8px rgb(var(--brand) / 0.45)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'mesa-gradient': 'linear-gradient(135deg, #ef4444 0%, #fbbf24 100%)',
        'brand-gradient': 'linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-strong)) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
