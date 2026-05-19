'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, CheckSquare, Users, FileText, LogOut, Calendar } from "lucide-react"

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/doctor-dashboard' },
    { name: 'To Do List', icon: CheckSquare, path: '/doctor-dashboard/todo' },
    { name: 'Patient Info', icon: Users, path: '/doctor-dashboard/patients' },
    { name: 'Lab Reports', icon: FileText, path: '/doctor-dashboard/reports' },
    { name: 'Scheduler & Alerts', icon: Calendar, path: '/doctor-dashboard/scheduler' },
  ]

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/[0.96] flex flex-col">
        <div className="p-6">
          <Link href="/doctor-dashboard" className="text-2xl font-bold tracking-tight">
            revivAl <span className="text-blue-500 text-sm align-top ml-1">Dr.</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/doctor-dashboard'
                ? pathname === '/doctor-dashboard'
                : pathname === item.path || pathname.startsWith(`${item.path}/`)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-white/10 flex items-center px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-10 w-full justify-between">
            <h2 className="text-xl font-semibold capitalize">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h2>

            <div className="flex items-center gap-4">
               <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
                 Dr
               </div>
            </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
