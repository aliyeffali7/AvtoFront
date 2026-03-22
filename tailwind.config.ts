import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        'text-primary': '#111827',
        'text-muted': '#6B7280',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
