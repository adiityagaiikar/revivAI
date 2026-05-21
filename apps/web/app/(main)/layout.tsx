'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Brain,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { useUser } from '@/hooks/useUser'

const menuItems = [
  { name: 'Dashboard',         href: '/dashboard',         icon: LayoutDashboard },
  { name: 'Fitness Assistant', href: '/fitness-assistant', icon: Dumbbell },
  { name: 'Exercises',         href: '/exercises',         icon: Activity },
  { name: 'Cognitive Games',   href: '/cognitive-games',   icon: Brain },
  { name: 'Overall Analysis',  href: '/overall-analysis',  icon: BarChart3 },
]

/* ── Skeleton shimmer ── */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/10 ${className}`}
    />
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loading } = useUser()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  /* First letter of name for avatar */
  const avatarLetter = user?.name?.charAt(0).toUpperCase() ?? ''

  return (
    <div
      className="min-h-screen w-full flex"
      style={{ background: '#050505' }}
    >
      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col fixed h-full z-50 border-r border-white/8"
        style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(16px)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/8">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
          >
            revi<span className="text-violet-400">VAI</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon     = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm',
                  isActive
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-violet-400' : 'text-white/40 group-hover:text-white/70'
                  )}
                />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User profile + logout */}
        <div className="p-4 border-t border-white/8 space-y-2">
          {/* Profile row */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 text-sm font-bold text-white">
              {loading ? (
                <Skeleton className="w-9 h-9 rounded-full" />
              ) : (
                avatarLetter || '?'
              )}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-3 w-24 mb-1.5" />
                  <Skeleton className="h-2.5 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white truncate leading-tight">
                    {user?.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-white/35 truncate leading-tight">
                    {user?.email ?? '—'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full flex items-center gap-3 text-white/35 hover:text-red-400 hover:bg-red-500/10 justify-start px-3 text-sm rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 min-h-screen" style={{ background: '#050505' }}>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
