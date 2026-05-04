import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Phase 23 — sourcemaps pour Sentry (upload via plugin Sentry quand
    // SENTRY_AUTH_TOKEN est dispo en CI ; sinon utile pour `vite preview`).
    sourcemap: true,
    // Phase 21 — seuil de warning ajusté après split charts/leaflet/markdown.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Coeur React (présent partout)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Data layer (présent partout)
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          // PDF — lourd (1.5 MB), uniquement factures + audits
          'react-pdf': ['@react-pdf/renderer'],
          // Phase 21 — Carto Leaflet (uniquement /pro/prospects-carte + /admin/prospects)
          leaflet: ['leaflet', 'react-leaflet', 'leaflet.heat'],
          // Phase 21 — Charts recharts (uniquement /pro/analytics)
          charts: ['recharts'],
          // Phase 21 — Markdown (articles + assistant uniquement)
          markdown: ['react-markdown', 'remark-gfm'],
          // Phase 21 — Validation Zod (présent partout, bien tree-shaké)
          validation: ['zod'],
          // Phase 21 — Bulk ZIP client-side (Phase 13.3 courriers)
          archive: ['jszip'],
        },
      },
    },
  },
})
