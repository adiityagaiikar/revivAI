'use client'

import { motion } from 'framer-motion'
import {
  Users, AlertTriangle, TrendingDown, TrendingUp,
  Activity, Clock, CheckCircle2, XCircle,
  Dumbbell, Brain, BarChart3, Bell,
} from 'lucide-react'
import Link from 'next/link'

/* ─────────────────────────────────────────────
   Mock data
───────────────────────────────────────────── */
const PATIENTS = [
  { name: 'Aditya Gaikar',    injury: 'ACL Reconstruction',    adherence: 87, lastActive: '2h ago',   trend: 'up',   score: 91 },
  { name: 'Priya Sharma',     injury: 'Rotator Cuff Repair',   adherence: 62, lastActive: '1d ago',   trend: 'down', score: 74 },
  { name: 'Marcus Thompson',  injury: 'Lumbar Disc Herniation', adherence: 94, lastActive: '30m ago',  trend: 'up',   score: 96 },
  { name: 'Sofia Reyes',      injury: 'Knee Osteoarthritis',   adherence: 45, lastActive: '3d ago',   trend: 'down', score: 58 },
  { name: 'James Okafor',     injury: 'Frozen Shoulder',       adherence: 78, lastActive: '5h ago',   trend: 'up',   score: 83 },
  { name: 'Yuki Tanaka',      injury: 'Plantar Fasciitis',     adherence: 91, lastActive: '1h ago',   trend: 'up',   score: 89 },
]

const ALERTS = [
  { patient: 'Aditya Gaikar',   message: 'Left knee stability dropped 15% this week', severity: 'high',   time: '2h ago' },
  { patient: 'Priya Sharma',    message: 'Missed 3 consecutive sessions — adherence at risk', severity: 'medium', time: '1d ago' },
  { patient: 'Sofia Reyes',     message: 'Form score below 60% for 5 sessions in a row', severity: 'high',   time: '3d ago' },
  { patient: 'James Okafor',    message: 'Shoulder ROM improved by 12° — ahead of schedule', severity: 'info',   time: '5h ago' },
]

const STATS = [
  { label: 'Active Patients',   value: '24',  change: '+3',   icon: Users,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20'    },
  { label: 'Avg Adherence',     value: '76%', change: '+4%',  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { label: 'Sessions Today',    value: '18',  change: '+2',   icon: Activity,  color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20'  },
  { label: 'Alerts Pending',    value: '3',   change: '-1',   icon: Bell,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
]

/* ─────────────────────────────────────────────
   Primitives
───────────────────────────────────────────── */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`}>
      {children}
    </div>
  )
}

function AdherenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : value >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${color}`}>
      {value}%
    </span>
  )
}

const floatUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22, delay: i * 0.07 },
  }),
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function ProviderDashboardPage() {
  return (
    <div
      className="min-h-screen p-8 space-y-8"
      style={{ background: '#050505', fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(6,182,212,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                Clinic Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Provider Dashboard</h1>
            <p className="text-white/40 mt-1 text-sm">Manage your patient roster and monitor recovery outcomes</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/doctor-dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Full Analytics
            </Link>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium transition-colors">
              <Users className="h-4 w-4" />
              Add Patient
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((s, i) => (
            <motion.div key={s.label} custom={i} variants={floatUp} initial="hidden" animate="visible">
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">{s.label}</p>
                    <p className="text-3xl font-bold text-white leading-none">{s.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {s.change.startsWith('+') ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className={`text-xs font-semibold ${s.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.change}
                      </span>
                      <span className="text-white/25 text-xs ml-1">this week</span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${s.border} ${s.bg} ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ── Patient roster + Alerts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Patient roster table — 2/3 */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.32 }}
          >
            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <h2 className="text-base font-semibold text-white">Patient Roster</h2>
                <span className="text-xs text-white/35">{PATIENTS.length} patients</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">Patient</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">Injury</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">Adherence</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">Score</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map((p, i) => (
                      <motion.tr
                        key={p.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/60 to-violet-500/60 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <span className="font-medium text-white group-hover:text-cyan-300 transition-colors">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-white/50 text-xs">{p.injury}</td>
                        <td className="px-4 py-3.5 text-center">
                          <AdherenceBadge value={p.adherence} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={`font-semibold ${p.score >= 85 ? 'text-emerald-400' : p.score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {p.score}%
                            </span>
                            {p.trend === 'up'
                              ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                              : <TrendingDown className="h-3 w-3 text-red-400" />
                            }
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right text-white/35 text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock className="h-3 w-3" />
                            {p.lastActive}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* Alerts — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.42 }}
          >
            <GlassCard className="h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="text-base font-semibold text-white">Alerts</h2>
                <span className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[10px] font-bold text-red-400">
                  {ALERTS.filter(a => a.severity === 'high').length}
                </span>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {ALERTS.map((alert, i) => {
                  const isHigh   = alert.severity === 'high'
                  const isMedium = alert.severity === 'medium'
                  const isInfo   = alert.severity === 'info'
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 300, damping: 22 }}
                      className={`p-3.5 rounded-xl border ${
                        isHigh   ? 'border-red-500/20 bg-red-500/8'
                        : isMedium ? 'border-amber-500/20 bg-amber-500/8'
                        : 'border-emerald-500/20 bg-emerald-500/8'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {isHigh ? (
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        ) : isMedium ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{alert.patient}</p>
                          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{alert.message}</p>
                          <p className="text-[10px] text-white/25 mt-1.5">{alert.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ── Quick nav ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.55 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Patient Reports',  icon: BarChart3,  href: '/doctor-dashboard/reports',   color: 'text-cyan-400',    border: 'border-cyan-500/20',    bg: 'bg-cyan-500/8'    },
            { label: 'Scheduler',        icon: Clock,      href: '/doctor-dashboard/scheduler',  color: 'text-violet-400',  border: 'border-violet-500/20',  bg: 'bg-violet-500/8'  },
            { label: 'Task List',        icon: CheckCircle2, href: '/doctor-dashboard/todo',     color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/8' },
            { label: 'All Patients',     icon: Users,      href: '/doctor-dashboard/patients',   color: 'text-amber-400',   border: 'border-amber-500/20',   bg: 'bg-amber-500/8'   },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 p-4 rounded-xl border ${item.border} ${item.bg} hover:bg-white/[0.06] transition-colors group`}
            >
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">{item.label}</span>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
