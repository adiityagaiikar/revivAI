'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, Brain, AlertTriangle, Activity, Users, Zap, Loader2 } from 'lucide-react'
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

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

/* ─────────────────────────────────────────────
   Custom tooltip
───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md px-4 py-3 text-xs shadow-xl">
      <p className="text-white/40 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400" />
        <span className="text-white/60">Adherence:</span>
        <span className="text-white font-bold">{payload[0].value}%</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
function StatCard({
  label, value, sub, valueColor, icon: Icon, iconColor, glow, loading,
}: {
  label: string; value: string; sub: string
  valueColor: string; icon: any; iconColor: string; glow?: boolean; loading?: boolean
}) {
  return (
    <GlassCard glow={glow} className="p-6 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{label}</p>
        {loading
          ? <div className="h-10 w-16 rounded-xl bg-white/8 animate-pulse mb-2" />
          : <p className={`text-4xl font-bold leading-none ${valueColor}`}>{value}</p>
        }
        <p className="text-xs text-white/35 mt-2.5">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl border border-white/10 bg-white/5 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
    </GlassCard>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [patients, setPatients] = useState<TriagePatient[]>([])
  const [loading, setLoading]   = useState(true)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/doctor/triage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setPatients(await res.json())
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [router])

  /* ── Compute real analytics from live data ── */

  // Average adherence across all patients with a score
  const averageAdherence = useMemo(() => {
    const scored = patients.filter((p) => p.complianceScore !== null)
    if (scored.length === 0) return null
    const avg = scored.reduce((sum, p) => sum + (p.complianceScore as number), 0) / scored.length
    return Math.round(avg)
  }, [patients])

  // Total sessions = sum of recentFormScores lengths
  const totalSessions = useMemo(
    () => patients.reduce((sum, p) => sum + p.recentFormScores.length, 0),
    [patients]
  )

  // Patients at risk: compliance < 60%
  const patientsAtRisk = useMemo(
    () => patients.filter((p) => p.complianceScore !== null && p.complianceScore < 60).length,
    [patients]
  )

  // Group patients by condition
  const conditionGroups = useMemo(() => {
    const map: Record<string, number> = {}
    patients.forEach((p) => {
      const cond = p.condition || 'General Rehabilitation'
      map[cond] = (map[cond] ?? 0) + 1
    })
    const total = patients.length || 1
    return Object.entries(map)
      .map(([condition, count]) => ({
        condition,
        patients: count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.patients - a.patients)
      .slice(0, 5)
  }, [patients])

  // Build area chart: aggregate recentFormScores per "session position" averaged across all patients
  // Each slot i = average score at position i across all patients who have at least i+1 sessions
  const adherenceChartData = useMemo(() => {
    const maxLen = Math.max(...patients.map((p) => p.recentFormScores.length), 0)
    if (maxLen === 0 || patients.length === 0) return []

    return Array.from({ length: Math.min(maxLen, 10) }, (_, i) => {
      const scores = patients
        .map((p) => p.recentFormScores[i])
        .filter((s) => s !== undefined)
      const avg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null
      return { session: `S${i + 1}`, adherence: avg }
    }).filter((d) => d.adherence !== null)
  }, [patients])

  // Alerts from compliance engine
  const clinicAlerts = useMemo(() => {
    return patients
      .filter((p) => p.complianceScore !== null && p.complianceScore < 80)
      .sort((a, b) => (a.complianceScore ?? 100) - (b.complianceScore ?? 100))
      .slice(0, 5)
      .map((p) => {
        const isCritical = (p.complianceScore ?? 0) < 60
        return {
          id: p._id,
          urgency: isCritical ? 'critical' : 'warning',
          message: isCritical
            ? `CRITICAL: ${p.name}'s compliance has dropped to ${p.complianceScore}%`
            : `${p.name}'s compliance is at ${p.complianceScore}% — below target`,
          time: 'Live data',
        }
      })
  }, [patients])

  const chartAvg = useMemo(() => {
    if (adherenceChartData.length === 0) return null
    const sum = adherenceChartData.reduce((a, b) => a + (b.adherence as number), 0)
    return Math.round(sum / adherenceChartData.length)
  }, [adherenceChartData])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Clinic Analytics</h1>
          <p className="text-white/60 mt-1">Macro-level performance and adherence intelligence across your patient roster.</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-xs text-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{patients.length} patients · Live from MongoDB</span>
          </div>
        )}
      </div>

      {/* ── Top metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Average Adherence"
          value={averageAdherence !== null ? `${averageAdherence}%` : '—'}
          sub={patients.length > 0 ? `Across ${patients.filter(p => p.complianceScore !== null).length} active patients` : 'No data yet'}
          valueColor={
            averageAdherence === null ? 'text-white/30'
            : averageAdherence >= 80 ? 'text-emerald-400'
            : averageAdherence >= 60 ? 'text-amber-400'
            : 'text-red-400'
          }
          icon={TrendingUp}
          iconColor="text-emerald-400"
          glow={false}
          loading={loading}
        />
        <StatCard
          label="Total AI Sessions"
          value={loading ? '—' : totalSessions.toLocaleString()}
          sub="Scored exercise sessions recorded"
          valueColor="text-white"
          icon={Brain}
          iconColor="text-cyan-400"
          glow={true}
          loading={loading}
        />
        <StatCard
          label="Patients at Risk"
          value={loading ? '—' : patientsAtRisk.toString()}
          sub="Compliance score below 60%"
          valueColor={patientsAtRisk > 0 ? 'text-red-400' : 'text-emerald-400'}
          icon={AlertTriangle}
          iconColor={patientsAtRisk > 0 ? 'text-red-400' : 'text-emerald-400'}
          glow={false}
          loading={loading}
        />
      </div>

      {/* ── Main area chart ── */}
      <GlassCard glow className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">Cohort Form Score Trend</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              Average form score across all patients by session number
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 rounded-full">
              Live
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
        ) : adherenceChartData.length < 2 ? (
          <div className="h-[280px] flex flex-col items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-white/10" />
            <p className="text-white/25 text-sm">Not enough session data yet</p>
            <p className="text-white/15 text-xs">Patients need at least 2 scored sessions</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={adherenceChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="rgba(6,182,212,0.8)" />
                  <stop offset="100%" stopColor="rgba(6,182,212,0)"   />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} horizontal={false} />
              <XAxis
                dataKey="session"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="adherence"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#colorAdherence)"
                dot={false}
                activeDot={{ r: 5, fill: '#06b6d4', stroke: 'rgba(6,182,212,0.4)', strokeWidth: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Chart legend */}
        {!loading && chartAvg !== null && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-cyan-400 rounded" />
              <span className="text-xs text-white/40">Avg Form Score %</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-white/25">cohort avg:</span>
              <span className={`text-xs font-bold ${
                chartAvg >= 80 ? 'text-emerald-400' : chartAvg >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {chartAvg}%
              </span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Bottom two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — Top Treated Conditions */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg border border-violet-500/20 bg-violet-500/10">
              <Users className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Top Treated Conditions</h3>
              <p className="text-[11px] text-white/35">Distribution across active roster</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : conditionGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01]">
              <Users className="h-6 w-6 text-white/10 mb-2" />
              <p className="text-white/25 text-xs">No patients assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conditionGroups.map((row, i) => (
                <div key={row.condition}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white/80 truncate pr-4">{row.condition}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-white/40">{row.patients} pts</span>
                      <span className="text-xs font-bold text-white">{row.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${row.pct}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, #06b6d4, #8b5cf6)'
                          : i === 1
                            ? 'rgba(6,182,212,0.7)'
                            : 'rgba(255,255,255,0.2)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {!loading && conditionGroups.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between">
              <span className="text-xs text-white/30">Total active patients</span>
              <span className="text-sm font-bold text-white">{patients.length}</span>
            </div>
          )}
        </GlassCard>

        {/* Right — Live Clinic Alerts */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Compliance Alerts</h3>
              <p className="text-[11px] text-white/35">Auto-generated from live compliance engine</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : clinicAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01]">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white/70">All patients within threshold</p>
              <p className="text-xs text-white/30 mt-1 text-center">
                No compliance scores below 80%. Great cohort health!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clinicAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-l-2 bg-white/[0.02] border border-white/8 ${
                    alert.urgency === 'critical'
                      ? 'border-l-red-500'
                      : 'border-l-amber-500'
                  }`}
                >
                  <Activity className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                    alert.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 leading-snug">{alert.message}</p>
                    <p className="text-[10px] text-white/25 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
