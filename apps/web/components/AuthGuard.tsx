'use client'

/**
 * AuthGuard — client-side RBAC wrapper.
 *
 * Usage in layouts:
 *   <AuthGuard requiredRole="doctor">…</AuthGuard>
 *   <AuthGuard requiredRole="patient">…</AuthGuard>
 *
 * Behaviour:
 *   • Not logged in          → redirect to /login
 *   • Wrong role             → redirect to /unauthorized
 *   • Loading                → full-screen skeleton
 *   • Correct role           → render children
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, type UserRole } from '@/lib/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole: UserRole
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role !== requiredRole) {
      router.replace('/unauthorized')
    }
  }, [user, loading, requiredRole, router])

  /* ── Loading state ── */
  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: '#050505' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-white/30 text-sm">Verifying access…</p>
        </div>
      </div>
    )
  }

  /* ── Not authed or wrong role — render nothing while redirect fires ── */
  if (!user || user.role !== requiredRole) return null

  return <>{children}</>
}
