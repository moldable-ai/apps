import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    // The authoring editor is lazy-loaded after opening a deck and carries the
    // full style/template authoring surface. Keep warnings focused on accidental
    // multi-megabyte chunks rather than that intentional editor split.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        app: 'index.html',
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '127.0.0.1',
  },
})
