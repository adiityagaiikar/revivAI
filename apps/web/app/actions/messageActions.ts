/**
 * messageActions.ts
 *
 * Client-side helpers for the doctor-patient chat feature.
 * Mirrors the pattern used in carePlanActions.ts — calls the Express
 * backend directly using the JWT token stored in localStorage.
 *
 * No 'use server' directive: these run in the browser.
 */

import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface ChatMessage {
  _id:       string
  sender:    { _id: string; name: string; role: string }
  receiver:  { _id: string; name: string; role: string }
  text:      string
  timestamp: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getToken(): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) throw new Error('Not authenticated. Please log in.')
  return token
}

/* ─────────────────────────────────────────────
   fetchMessages
   
   Retrieve the full chronological message thread between
   the authenticated user and `doctorId`.
───────────────────────────────────────────── */
export async function fetchMessages(doctorId: string): Promise<ChatMessage[]> {
  const token = getToken()
  try {
    const res = await fetch(`${API}/messages/${doctorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.messages ?? []
  } catch {
    return []
  }
}

/* ─────────────────────────────────────────────
   sendMessage
   
   Persist a new message from the logged-in user to `receiverId`.
   Returns the saved message object on success.
───────────────────────────────────────────── */
export async function sendMessage(
  receiverId: string,
  text:       string,
): Promise<ChatMessage> {
  const token = getToken()
  const res = await fetch(`${API}/messages`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`,
    },
    body: JSON.stringify({ receiverId, text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to send message (${res.status})`)
  return data.message as ChatMessage
}
