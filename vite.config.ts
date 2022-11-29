import { defineConfig } from 'vite'
import react from 'vite-preset-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
