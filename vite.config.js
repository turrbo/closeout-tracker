import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Change '/closeout-tracker/' to match your GitHub repo name
  base: process.env.GITHUB_ACTIONS ? '/closeout-tracker/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'capy-1770952893959.fly.capy.computer',
      '.happycapy.ai',
      '.fly.capy.computer',
    ],
  },
})
