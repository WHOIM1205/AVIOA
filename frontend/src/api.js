// api.js — the only place that talks to the backend. Three thin fetch helpers.
// Kept separate from components so the network details live in one spot.
import { API_BASE_URL as BASE } from './config'

// One copilot turn from pasted text. Sends the current form so the backend can merge.
export async function sendChat(message, currentForm) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, current_form: currentForm }),
  })
  if (!res.ok) throw new Error('Chat request failed')
  return res.json()
}

// One copilot turn from an uploaded document. Same pipeline, multipart body.
export async function uploadDocument(file, currentForm) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('current_form', JSON.stringify(currentForm))
  const res = await fetch(`${BASE}/chat/upload`, { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

// Check the current form against saved complaints before saving (Bonus Feature 5).
export async function checkDuplicate(form) {
  const res = await fetch(`${BASE}/complaints/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) throw new Error('Duplicate check failed')
  return res.json()
}

// Persist the current complaint (the "Save Complaint" button).
export async function saveComplaint(form) {
  const res = await fetch(`${BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) throw new Error('Save failed')
  return res.json()
}
