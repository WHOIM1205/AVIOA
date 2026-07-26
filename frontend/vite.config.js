import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is our dev server + bundler. The React plugin enables JSX + fast refresh.
//
// Dev proxy: the frontend calls same-origin relative paths (e.g. /chat), and Vite
// forwards them to the FastAPI backend server-side. This means the browser never makes
// a cross-origin request, so CORS never applies — the app works no matter which port
// the dev server ends up on (5173, 5174, …) or whether it's opened via localhost or
// 127.0.0.1. In production, set VITE_API_BASE_URL to the real backend URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': 'http://localhost:8000',        // covers /chat and /chat/upload
      '/complaints': 'http://localhost:8000',  // covers /complaints and /complaints/check-duplicate
      '/health': 'http://localhost:8000',
    },
  },
})
