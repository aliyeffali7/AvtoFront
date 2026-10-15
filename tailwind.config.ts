import type { Config } from 'tailwindcss'

// Servo design tokens (see design/REDESIGN_SPEC.md).
// Legacy colour names (bg, cream, rule, accent, ...) are kept and remapped to the
// closest Servo value so older screens recolour without being edited.
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Servo tokens ---
        paper: '#F4F4F4',
        surface: '#FFFFFF',
        'surface-2': '#EBEBEB',
        border: '#E0E0E0',
        'border-strong': '#CFCFCF',
        'text-1': '#090909',
        'text-2': '#3D3D3D',
        'text-3': '#6B6B6B',
        'text-4': '#A0A0A0',
        ink: '#090909',
        'ink-up': '#262626',
        primary: { DEFAULT: '#090909', hover: '#262626', active: '#000000' },
        signal: '#D1442F',
        success: { DEFAULT: '#0F7A5A', subtle: '#E6F2EC', strong: '#0A5943', bg: '#E6F2EC' },
        warning: { DEFAULT: '#B45309', subtle: '#FDF0DC', strong: '#8A3F07', bg: '#FDF0DC' },
        danger: { DEFAULT: '#9B1C1C', subtle: '#F7E4E2', strong: '#7F1515', bg: '#F7E4E2' },
        info: { DEFAULT: '#1F5F8B', subtle: '#E4EDF3', strong: '#174E73' },

        // --- Legacy aliases ---
        bg: '#F4F4F4',
        'surface-alt': '#EBEBEB',
        cream: '#F4F4F4',
        sidebar: '#090909',
        'sidebar-active': '#262626',
        'sidebar-accent': '#D1442F',
        'ink-muted': '#6B6B6B',
        'ink-soft': '#3D3D3D',
        rule: '#E0E0E0',
        accent: '#090909',
        'accent-hover': '#262626',
        paid: '#F4F4F4',
        'paid-bg': '#0F7A5A',
      },
      fontFamily: {
        display: ['"Libre Franklin"', 'system-ui', 'sans-serif'],
        serif: ['"Libre Franklin"', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        h1: ['34px', { lineHeight: '40px', letterSpacing: '-0.035em', fontWeight: '700' }],
        h2: ['26px', { lineHeight: '32px', letterSpacing: '-0.03em', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '26px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body-l': ['17px', { lineHeight: '26px' }],
        body: ['15px', { lineHeight: '23px' }],
        small: ['13px', { lineHeight: '19px' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '500' }],
        money: ['18px', { lineHeight: '24px', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '10px',
        '2xl': '10px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(9,9,9,.06)',
        DEFAULT: 'none',
        md: '0 4px 12px rgba(9,9,9,.08)',
        lg: '0 12px 32px rgba(9,9,9,.14)',
        xl: '0 12px 32px rgba(9,9,9,.14)',
        '2xl': '0 12px 32px rgba(9,9,9,.14)',
      },
      transitionTimingFunction: {
        servo: 'cubic-bezier(.2,0,0,1)',
      },
    },
  },
  plugins: [],
}
export default config
