'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, Users, FileText, LogOut,
  Calendar, MessageSquare, ClipboardList, BarChart3, LineChart,
} from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { useAuth } from '@/lib/AuthContext'
import { AuthGuard } from '@/components/AuthGuard'

const menuItems = [
  { name: 'Dashboard',          icon: LayoutDashboard, path: '/doctor-dashboard' },
  { name: 'To Do List',         icon: CheckSquare,     path: '/doctor-dashboard/todo' },
  { name: 'Patient Info',       icon: Users,           path: '/doctor-dashboard/patients' },
  { name: 'Lab Reports',        icon: FileText,        path: '/doctor-dashboard/reports' },
  { name: 'Scheduler & Alerts', icon: Calendar,        path: '/doctor-dashboard/scheduler' },
  { name: 'Messages',           icon: MessageSquare,   path: '/doctor-dashboard/messages' },
  { name: 'Care Plan Builder',  icon: ClipboardList,   path: '/doctor-dashboard/care-plan-builder' },
  { name: 'Analytics',          icon: BarChart3,       path: '/doctor-dashboard/analytics' },
  { name: 'Model Diagnostics',   icon: LineChart,       path: '/doctor/analytics/model-diagnostics' },
]

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />
}

function DoctorSidebar() {
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()

  const avatarLetter = user?.name?.charAt(0).toUpperCase() ?? ''

  return (
    <aside
      className="w-64 flex flex-col fixed h-full z-50 border-r border-white/8"
      style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(16px)' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/8 flex items-center gap-2">
        <Link href="/doctor-dashboard" className="text-xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          revi<span className="text-violet-400">VAI</span>
        </Link>
        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ml-1 font-medium">
          Dr.
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/doctor-dashboard'
              ? pathname === '/doctor-dashboard'
              : pathname === item.path || pathname.startsWith(`${item.path}/`)
          return (
            <Link key={item.path} href={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm',
                isActive ? 'bg-cyan-500/10 text-white border border-cyan-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-white/70')} />
              <span className="font-medium">{item.name}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </Link>
          )
        })}
      </nav>

      {/* User profile + logout */}
      <div className="p-4 border-t border-white/8 space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-500 text-sm font-bold text-white">
            {loading ? <Skeleton className="w-9 h-9 rounded-full" /> : (avatarLetter || 'D')}
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <><Skeleton className="h-3 w-24 mb-1.5" /><Skeleton className="h-2.5 w-32" /></>
            ) : (
              <>
                <p className="text-sm font-medium text-white truncate leading-tight">{user?.name ?? 'Doctor'}</p>
                <p className="text-xs text-white/35 truncate leading-tight">
                  {user?.email ?? '—'}
                  <span className="ml-1.5 text-[10px] font-semibold text-cyan-400/70 uppercase">· Provider</span>
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="doctor">
      <div className="min-h-screen w-full flex" style={{ background: '#050505' }}>
        <DoctorSidebar />
        <main className="flex-1 ml-64 min-h-screen" style={{ background: '#050505' }}>
          <div className="p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </AuthGuard>
  )
}
