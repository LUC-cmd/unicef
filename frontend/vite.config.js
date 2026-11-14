import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api est relayé vers Spring Boot : pas de problème de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.VITE_API_URL || 'http://localhost:8080' },
  },
})
