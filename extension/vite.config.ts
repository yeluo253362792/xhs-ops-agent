import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'assets/background.js'
          if (chunkInfo.name === 'content') return 'assets/content.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || ''
          if (info.endsWith('popup/index.html')) return 'assets/popup.html'
          if (info === 'content.css') return 'assets/content.css'
          if (/\.css$/.test(info)) return 'assets/[name].[hash][extname]'
          return 'assets/[name][extname]'
        }
      }
    }
  }
})
