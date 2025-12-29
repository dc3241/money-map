import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Handle Firebase modules (ESM-only package) - check for node_modules/firebase
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          // Handle chart library (large library, safe to chunk separately)
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }
          // Handle utility libraries (smaller, but can be chunked)
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/zustand')) {
            return 'utils-vendor';
          }
          // Let Vite handle React automatically - don't manually chunk it
          // This ensures React and React-DOM stay together and load correctly
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit if needed, but better to split
  },
})

