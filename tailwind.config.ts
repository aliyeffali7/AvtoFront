import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#DEDBD0',
        surface: '#FFFFFF',
        'surface-alt': '#EDEAE0',
        cream: '#F7F5EF',
        sidebar: '#1F2A24',
        'sidebar-active': '#2A3C33',
        'sidebar-accent': '#1F4D36',
        ink: '#1F2A24',
        'ink-muted': '#6b7264',
        'ink-soft': '#4b5346',
        rule: '#CBD3C7',
        accent: '#1F4D36',
        'accent-hover': '#163827',
        warning: '#8a5a12',
        'warning-bg': '#FCEFD1',
        danger: '#A13D2B',
        'danger-bg': '#F3DCD3',
        success: '#1F4D36',
        'success-bg': '#DCE8DF',
        paid: '#F7F5EF',
        'paid-bg': '#1F4D36',
      },
      fontFamily: {
        serif: ['Newsreader', 'Noto Sans', 'serif'],
        sans: ['IBM Plex Sans', 'Noto Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Noto Sans', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        full: '9999px',
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: '0 8px 30px rgba(31,42,36,.18)',
        xl: '0 8px 30px rgba(31,42,36,.18)',
        '2xl': '0 8px 30px rgba(31,42,36,.22)',
      },
    },
  },
  plugins: [],
}
export default config
