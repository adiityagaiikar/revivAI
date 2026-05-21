'use client'

import { useState, useEffect } from 'react'
import { API } from '@/lib/api'

export interface UserProfile {
  id: string
  name: string
  email: string
  username: string
  role: string
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }
        const res = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setUser(data)
      } catch {
        /* ignore — sidebar just shows skeleton */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading }
}
