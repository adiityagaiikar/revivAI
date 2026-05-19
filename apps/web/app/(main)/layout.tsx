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
  User
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

const menuItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Fitness Assistant', 
    href: '/fitness-assistant', 
    icon: Dumbbell 
  },
  { 
    name: 'Exercises', 
    href: '/exercises', 
    icon: Activity 
  },
  { 
    name: 'Cognitive Games', 
    href: '/cognitive-games', 
    icon: Brain 
  },
  { 
    name: 'Overall Analysis', 
    href: '/overall-analysis', 
    icon: BarChart3 
  },
]

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen w-full bg-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-white/10 flex flex-col fixed h-full z-50">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
            revivAl
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                  isActive 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                )} />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">User</p>
              <p className="text-xs text-neutral-400 truncate">user@example.com</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            className="w-full flex items-center gap-3 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 justify-start px-4"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen bg-black">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
