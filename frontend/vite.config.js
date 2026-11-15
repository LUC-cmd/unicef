import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api est relayé vers Spring Boot : pas de problème de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:8080',
      '/assistant/health': {
        target: process.env.VITE_ASSISTANT_URL || 'http://localhost:8092',
        rewrite: (chemin) => chemin.replace(/^\/assistant/, ''),
      },
      '/assistant/questions': {
        target: process.env.VITE_ASSISTANT_URL || 'http://localhost:8092',
        rewrite: (chemin) => chemin.replace(/^\/assistant/, ''),
      },
    },
  },
})
