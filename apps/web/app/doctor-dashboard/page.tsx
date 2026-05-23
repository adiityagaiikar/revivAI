'use client'

import {
  Users, FileText, CheckSquare, Activity, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, ChevronRight,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface TriagePatient {
  _id: string
  name: string
  email: string
  condition: string
  complianceScore: number | null
  recentFormScores: number[]
  nextAppointment: string | null
}

const ICONS: Record<string, any> = { Users, FileText, CheckSquare, Activity }

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function complianceColor(score: number | null): string {
  if (score === null) return 'text-white/30'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function complianceBg(score: number | null): string {
  if (score === null) return 'bg-white/5 border-white/10'
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 60) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

function complianceIcon(score: number | null) {
  if (score === null) return <Clock className="h-3.5 w-3.5 text-white/25" />
  if (score >= 80) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (score >= 60) return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
  return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
}

/** Tiny sparkline rendered as inline SVG */
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <span className="text-xs text-white/20">—</span>
  }
  const w = 64, h = 24, pad = 2
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2)
    const y = h - pad - ((s - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })
  const lastScore = scores[scores.length - 1]
  const color = lastScore >= 80 ? '#34d399' : lastScore >= 60 ? '#fbbf24' : '#f87171'
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Last point dot */}
      {pts.length > 0 && (() => {
        const [lx, ly] = pts[pts.length - 1].split(',').map(Number)
        return <circle cx={lx} cy={ly} r="2.5" fill={color} />
      })()}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Triage Table component
───────────────────────────────────────────── */
function TriageTable({ patients, loading }: { patients: TriagePatient[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="py-10 text-center">
        <Users className="h-10 w-10 mx-auto mb-3 text-white/10" />
        <p className="text-white/30 text-sm">No patients assigned yet.</p>
        <p className="text-white/20 text-xs mt-1">
          Run <code className="text-cyan-400/60">node backend/seedTriagePatients.js</code> to seed demo data.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Patient</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Condition</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Compliance</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-widest hidden sm:table-cell">Form Trend</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-widest hidden md:table-cell">Next Appt.</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {patients.map((p) => (
            <tr key={p._id} className="hover:bg-white/[0.02] transition-colors group">
              {/* Patient name + avatar */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white leading-tight">{p.name}</p>
                    <p className="text-[11px] text-white/30 leading-tight">{p.email}</p>
                  </div>
                </div>
              </td>

              {/* Condition */}
              <td className="py-3.5 px-4">
                <span className="text-white/60 text-xs">{p.condition}</span>
              </td>

              {/* Compliance score badge */}
              <td className="py-3.5 px-4">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${complianceBg(p.complianceScore)}`}>
                  {complianceIcon(p.complianceScore)}
                  <span className={complianceColor(p.complianceScore)}>
                    {p.complianceScore !== null ? `${p.complianceScore}%` : 'N/A'}
                  </span>
                </div>
              </td>

              {/* Sparkline */}
              <td className="py-3.5 px-4 hidden sm:table-cell">
                <Sparkline scores={p.recentFormScores} />
              </td>

              {/* Next appointment */}
              <td className="py-3.5 px-4 hidden md:table-cell">
                <span className="text-white/40 text-xs">
                  {p.nextAppointment
                    ? new Date(p.nextAppointment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
              </td>

              {/* View link */}
              <td className="py-3.5 px-4 text-right">
                <Link
                  href={`/doctor-dashboard/patients?focus=${p._id}`}
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-cyan-400 transition-colors group-hover:text-white/60"
                >
                  View <ChevronRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main dashboard page
───────────────────────────────────────────── */
export default function DoctorDashboard() {
  const [dashboardData, setDashboardData]   = useState<any>(null)
  const [triagePatients, setTriagePatients] = useState<TriagePatient[]>([])
  const [statsLoading, setStatsLoading]     = useState(true)
  const [triageLoading, setTriageLoading]   = useState(true)
  const [actionItems, setActionItems]       = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }

      // Fetch stats + triage in parallel
      const [dashRes, triageRes] = await Promise.all([
        fetch(`${API}/dashboard/doctor`,        { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/dashboard/doctor/triage`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (dashRes.ok) {
        const d = await dashRes.json()
        setDashboardData(d)
        setActionItems(d.actionItems || [])
      }
      setStatsLoading(false)

      if (triageRes.ok) {
        setTriagePatients(await triageRes.json())
      }
      setTriageLoading(false)
    }
    fetchAll().catch(console.error)
  }, [router])

  const markTaskComplete = useCallback(async (taskId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (res.ok) {
        setActionItems((prev) => prev.filter((t) => t._id !== taskId))
      }
    } catch (e) { console.error(e) }
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Doctor Dashboard</h1>
        <p className="text-white/60 mt-1">Here's what is happening with your patients today.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : dashboardData?.stats?.map((stat: any, i: number) => {
              const Icon = ICONS[stat.iconName] || Users
              return (
                <GlassCard key={i} className="p-6 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-white leading-none">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-semibold">Active</span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border border-white/10 bg-white/5 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </GlassCard>
              )
            })}
      </div>

      {/* ── Patient Triage Table ── */}
      <GlassCard glow className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <h2 className="text-base font-semibold text-white">Patient Triage</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              Live compliance scores computed from exercise session data
            </p>
          </div>
          <Link
            href="/doctor-dashboard/patients"
            className="text-xs text-white/30 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="px-2 py-2">
          <TriageTable patients={triagePatients} loading={triageLoading} />
        </div>
      </GlassCard>

      {/* ── Action Items ── */}
      <GlassCard className="p-6">
        <h2 className="text-base font-semibold text-white mb-5">Action Items</h2>
        <div className="space-y-3">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
          ) : actionItems.length === 0 ? (
            <p className="text-white/30 text-sm">No pending action items.</p>
          ) : (
            actionItems.map((task: any) => (
              <div
                key={task._id}
                className="flex gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => markTaskComplete(task._id)}
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.02] text-white/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
                  aria-label="Mark task complete"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{task.title}</p>
                  <p className="text-xs text-white/35 mt-0.5">Patient: {task.patientId?.name || 'Unknown'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  )
}
