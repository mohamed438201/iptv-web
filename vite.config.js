import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/live': {
        target: 'http://ugeen.live:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/live/, '')
      },
      '/b17': {
        target: 'http://b1718o.top:80',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/b17/, '')
      },
      '/saidi': {
        target: 'http://ea.saidisat.com:80',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/saidi/, '')
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500
  }
})
