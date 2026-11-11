import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In the Base44 sandbox the preview is proxied through a public hostname, so the
// dev server has to accept that Host header. Only applied when the platform flag
// is set; everywhere else Vite keeps its default host allowlist.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1'
const sandboxHostDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts:
      previewMode && sandboxHostDomain ? [`.${sandboxHostDomain}`] : undefined,
    // Single origin: the browser only ever talks to the Vite dev server,
    // which forwards /api to the Express service.
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://api:8000',
        changeOrigin: true,
      },
    },
  },
})
