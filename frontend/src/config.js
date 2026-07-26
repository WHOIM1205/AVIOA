// config.js — the one place the frontend reads its environment configuration.
//
// The backend URL comes from a Vite environment variable (VITE_API_BASE_URL).
// Vite only exposes variables prefixed with VITE_ to the browser, and inlines
// them at build time via import.meta.env. If it's not set, we fall back to the
// local dev backend so `npm run dev` works with zero setup.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
