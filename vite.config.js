import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/the-machine/', // <--- Adicione isso aqui se for usar GitHub Pages!
})