import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is our dev server + bundler. The React plugin enables JSX + fast refresh.
export default defineConfig({
  plugins: [react()],
})
