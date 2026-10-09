import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Entrada independente: não importa App, AuthGate, Supabase, Worker ou o SW.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5175, strictPort: true },
  preview: { host: '0.0.0.0', port: 5175, strictPort: true },
  build: {
    outDir: '../../output/workflow-preview',
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
})
