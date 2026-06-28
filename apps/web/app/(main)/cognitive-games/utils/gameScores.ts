/** Per-game score persistence in localStorage */

import { getScopedStorageKey } from '@/lib/storage-scope'

export type GameScore = {
  score: number      // 0-100
  date: string       // ISO string
  label?: string     // e.g. "Score: 8" or "Level: 4"
}

const KEY = (slug: string) => `cg_scores_${slug}`

export function saveGameScore(slug: string, score: number, label?: string) {
  try {
    const storageKey = getScopedStorageKey(KEY(slug))
    const existing = getGameScores(slug)
    existing.push({ score, date: new Date().toISOString(), label })
    // Keep last 20 entries
    const trimmed = existing.slice(-20)
    localStorage.setItem(storageKey, JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

export function getGameScores(slug: string): GameScore[] {
  try {
    const raw = localStorage.getItem(getScopedStorageKey(KEY(slug)))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
