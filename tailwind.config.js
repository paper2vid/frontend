/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep:  '#0A0E1F',
          dark:  '#0F1423',
          card:  '#161D35',
          hover: '#1E2847',
          border:'#252F50',
        },
        accent: {
          blue:   '#4091FF',
          teal:   '#00D2B4',
          orange: '#FF8C40',
          purple: '#A855F7',
          red:    '#FF4560',
        },
        text: {
          primary:   '#F0F5FF',
          secondary: '#A0AFD2',
          muted:     '#646F96',
          dim:       '#3A4468',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.4s ease forwards',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow:    { from: { boxShadow: '0 0 8px rgba(64,145,255,0.3)' }, to: { boxShadow: '0 0 24px rgba(64,145,255,0.7)' } },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(64,145,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(64,145,255,0.03) 1px, transparent 1px)",
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(64,145,255,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
    },
  },
  plugins: [],
}
