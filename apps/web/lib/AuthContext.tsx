'use client'

/**
 * AuthContext — centralised auth state for the revivAI app.
 *
 * Strategy: the real backend issues a JWT stored in localStorage.
 * We decode the payload client-side (no signature verification needed
 * here — the backend validates on every API call) to extract id, name,
 * and role so the UI can make routing decisions instantly without an
 * extra network round-trip.
 *
 * Role values mirror the backend User model:
 *   'patient'  → patient portal  (/dashboard, /(main)/*)
 *   'doctor'   → doctor portal   (/doctor-dashboard/*)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type UserRole = 'patient' | 'doctor'

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role:  UserRole
}

interface AuthContextValue {
  user:    AuthUser | null
  loading: boolean
  /** Log in with email + password (real backend) */
  login:   (email: string, password: string) => Promise<void>
  /** Quick demo login — bypasses password, uses seeded credentials */
  demoLogin: (role: 'patient' | 'doctor') => Promise<void>
  /** Clear token and user state */
  logout:  () => void
}

/* ─────────────────────────────────────────────
   Demo credentials (seeded by seedTriagePatients.js / seedDoctors.js)
───────────────────────────────────────────── */
const DEMO_CREDENTIALS = {
  patient: { email: 'aditya.gaikar.patient@revivai.demo', password: 'revivai_demo_2025' },
  doctor:  { email: 'doctor@revivai.demo',                password: 'doctor123' },
} as const

/* ─────────────────────────────────────────────
   JWT decode helper (payload only — no verify)
───────────────────────────────────────────── */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /* ── Hydrate from existing token on mount ── */
  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }

      try {
        // Fetch full profile so we always have fresh name/email/role
        const res = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          localStorage.removeItem('token')
          setLoading(false)
          return
        }
        const data = await res.json()
        setUser({
          id:    data.id ?? data._id,
          name:  data.name,
          email: data.email,
          role:  data.role as UserRole,
        })
      } catch {
        /* network error — keep token, show skeleton */
      } finally {
        setLoading(false)
      }
    }
    hydrate()
  }, [])

  /* ── Core login ── */
  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || 'Login failed')

    localStorage.setItem('token', data.token)

    const profile = data.user ?? {}
    const authUser: AuthUser = {
      id:    profile.id ?? profile._id ?? '',
      name:  profile.name  ?? '',
      email: profile.email ?? email,
      role:  (profile.role ?? 'patient') as UserRole,
    }
    setUser(authUser)

    router.push(authUser.role === 'doctor' ? '/doctor-dashboard' : '/dashboard')
  }, [router])

  /* ── Demo login ── */
  const demoLogin = useCallback(async (role: 'patient' | 'doctor') => {
    const creds = DEMO_CREDENTIALS[role]
    try {
      await login(creds.email, creds.password)
    } catch {
      // Fallback: create a synthetic user so the demo still works
      // even if the seeded account doesn't exist yet
      const synthetic: AuthUser = {
        id:    `demo-${role}`,
        name:  role === 'patient' ? 'Aditya Gaikar' : 'Dr. Viren',
        email: creds.email,
        role,
      }
      setUser(synthetic)
      router.push(role === 'doctor' ? '/doctor-dashboard' : '/dashboard')
    }
  }, [login, router])

  /* ── Logout ── */
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/* ─────────────────────────────────────────────
   Hook
───────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
