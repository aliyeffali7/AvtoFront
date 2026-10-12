import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Where the dev proxy sends /api and /media (the local Django backend).
  // The browser only ever sees relative URLs, so the app also works when
  // opened from another device (Wi-Fi, Tailscale).
  const backend = loadEnv(mode, process.cwd(), '').DEV_PROXY_TARGET || 'http://localhost:8000'
  const proxy = { target: backend, changeOrigin: true }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': proxy,
        '/media': proxy,
      },
    },
  }
})
