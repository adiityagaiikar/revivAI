'use client'

import { useAuth } from '@/lib/AuthContext'
import { ShieldX, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  const { user, logout } = useAuth()

  const correctDashboard = user?.role === 'doctor' ? '/doctor-dashboard' : '/dashboard'
  const correctLabel     = user?.role === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard'

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: '#050505' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(239,68,68,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md p-10">

          {/* Icon */}
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
            <ShieldX className="h-8 w-8 text-red-400" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Access Denied</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-2">
            You don't have permission to view this page.
          </p>
          {user && (
            <p className="text-white/30 text-xs mb-8">
              Signed in as <span className="text-white/60 font-medium">{user.name}</span>
              {' '}·{' '}
              <span className="capitalize text-white/40">{user.role}</span>
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {user ? (
              <Link
                href={correctDashboard}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Go to {correctLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {user && (
              <button
                onClick={logout}
                className="w-full py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Sign out and switch account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
