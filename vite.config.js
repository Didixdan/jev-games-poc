import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), vue()],
  server: {
    proxy: {
      '/move': 'http://localhost:3001',
      '/sudoku-move': 'http://localhost:3001',
    }
  }
})
