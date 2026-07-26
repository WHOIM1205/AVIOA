// config.js — the one place the frontend reads its environment configuration.
//
// The backend URL comes from a Vite environment variable (VITE_API_BASE_URL).
// Vite only exposes variables prefixed with VITE_ to the browser, and inlines
// them at build time via import.meta.env.
//
// Default is an EMPTY string, i.e. same-origin relative requests (fetch('/chat')).
// In dev the Vite proxy (see vite.config.js) forwards those to the backend, avoiding
// CORS entirely. In production, set VITE_API_BASE_URL to the real backend URL.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || ''
