import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: '/src' },
      {
        find: /^@moldable-ai\/ui$/,
        replacement: fileURLToPath(
          new URL('./src/client/moldable-ui.ts', import.meta.url),
        ),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
  },
})
