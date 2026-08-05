import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import lumiereStudio from './server/vite-plugin.mjs'

export default defineConfig({
  plugins: [react(), lumiereStudio()],
  base: './',
})
