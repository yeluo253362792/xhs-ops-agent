import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import webExtension from 'vite-plugin-web-extension'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: resolve(__dirname, 'public/manifest.json'),
      watchFilePaths: [
        resolve(__dirname, 'public/manifest.json'),
        resolve(__dirname, 'src/content/index.ts'),
        resolve(__dirname, 'src/content/web-app.ts'),
      ],
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
