'use client'

import { useState } from 'react'
import { Mail, Lock, LogIn, User, Stethoscope, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const { login, demoLogin } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [demoLoading, setDemoLoading] = useState<'patient' | 'doctor' | null>(null)

  /* ── Real credential login ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to server. Make sure the backend is running.'
          : err.message ?? 'Login failed'
      )
    } finally {
      setLoading(false)
    }
  }

  /* ── Demo quick-login ── */
  const handleDemo = async (role: 'patient' | 'doctor') => {
    setError('')
    setDemoLoading(role)
    try {
      await demoLogin(role)
    } catch (err: any) {
      setError(err.message ?? 'Demo login failed')
    } finally {
      setDemoLoading(null)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
      style={{ background: '#050505' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 70%)' }}
      />

      {/* Back link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <p className="text-2xl font-bold text-white tracking-tight">
              revi<span className="text-violet-400">VAI</span>
            </p>
            <h1 className="text-xl font-semibold text-white mt-2">Welcome back</h1>
            <p className="text-white/40 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* ── Demo quick-login buttons ── */}
          <div className="space-y-3 mb-6">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest text-center">
              Quick Demo Access
            </p>

            {/* Patient demo */}
            <button
              type="button"
              onClick={() => handleDemo('patient')}
              disabled={!!demoLoading || loading}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30 shrink-0">
                {demoLoading === 'patient'
                  ? <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                  : <User className="h-5 w-5 text-violet-400" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">
                  {demoLoading === 'patient' ? 'Signing in…' : 'Login as Patient (Aditya)'}
                </p>
                <p className="text-xs text-white/40">Patient portal · /dashboard</p>
              </div>
              <div className="text-[10px] font-bold text-violet-400 border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0">
                DEMO
              </div>
            </button>

            {/* Doctor demo */}
            <button
              type="button"
              onClick={() => handleDemo('doctor')}
              disabled={!!demoLoading || loading}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 shrink-0">
                {demoLoading === 'doctor'
                  ? <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                  : <Stethoscope className="h-5 w-5 text-cyan-400" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">
                  {demoLoading === 'doctor' ? 'Signing in…' : 'Login as Provider (Dr. Viren)'}
                </p>
                <p className="text-xs text-white/40">Doctor portal · /doctor-dashboard</p>
              </div>
              <div className="text-[10px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 rounded-full shrink-0">
                DEMO
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[11px] text-white/25 uppercase tracking-widest">or sign in with credentials</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Credential form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!demoLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                : <><LogIn className="h-4 w-4" /> Sign In</>}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center space-y-1">
            <p className="text-white/35 text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-white hover:underline">Sign up</Link>
            </p>
            <p className="text-white/25 text-xs">
              Medical professional?{' '}
              <Link href="/doctor-register" className="text-white/50 hover:text-white hover:underline transition-colors">
                Register as Doctor
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
