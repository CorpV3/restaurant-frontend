import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/v1/users': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/v1/restaurants': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '/api/v1/orders': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '/api/v1/delivery-integrations': {
        target: 'http://localhost:8015',
        changeOrigin: true,
      },
      '/api/v1/webhooks': {
        target: 'http://localhost:8015',
        changeOrigin: true,
      }
    }
  }
})
