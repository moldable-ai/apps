import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
        widget: 'widget.html',
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
