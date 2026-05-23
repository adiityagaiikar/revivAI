'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts'
import { TrendingUp, Brain, AlertTriangle, Activity, Users, Zap } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

/* ─────────────────────────────────────────────
   Mock data
───────────────────────────────────────────── */
const ADHERENCE_30D = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(); day.setDate(day.getDate() - (29 - i))
  const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  // Realistic upward-trending adherence with noise
  const base = 68 + i * 0.55
  const noise = (Math.sin(i * 1.3) * 6) + (Math.cos(i * 0.7) * 4)
  return { day: label, adherence: Math.min(98, Math.max(52, Math.round(base + noise))) }
})

const CONDITIONS = [
  { condition: 'Post-op ACL Reconstruction', patients: 8,  pct: 32 },
  { condition: 'Chronic Lower Back Pain',    patients: 6,  pct: 24 },
  { condition: 'Post-op Rotator Cuff',       patients: 5,  pct: 20 },
  { condition: 'Sciatica',                   patients: 4,  pct: 16 },
  { condition: 'General Rehabilitation',     patients: 2,  pct: 8  },
]

const RECENT_ALERTS = [
  { id: 1, urgency: 'critical', message: "Aditya Gaikar's compliance dropped to 55%",        time: 'Today, 09:14 AM' },
  { id: 2, urgency: 'warning',  message: 'Priya Sharma missed 2 consecutive sessions',        time: 'Today, 08:30 AM' },
  { id: 3, urgency: 'warning',  message: "Rohan Mehta's form score dipped below 80%",         time: 'Yesterday' },
  { id: 4, urgency: 'info',     message: 'New lab report submitted by Priya Sharma',          time: 'Yesterday' },
  { id: 5, urgency: 'info',     message: 'Rohan Mehta completed all assigned exercises',      time: 'Apr 20' },
]

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
  label, value, sub, valueColor, icon: Icon, iconColor, glow,
}: {
  label: string; value: string; sub: string
  valueColor: string; icon: any; iconColor: string; glow?: boolean
}) {
  return (
    <GlassCard glow={glow} className="p-6 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{label}</p>
        <p className={`text-4xl font-bold leading-none ${valueColor}`}>{value}</p>
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
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Clinic Analytics</h1>
        <p className="text-white/60 mt-1">Macro-level performance and adherence intelligence across your patient roster.</p>
      </div>

      {/* ── Top metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Average Adherence"
          value="82%"
          sub="↑ 4% vs last 30 days"
          valueColor="text-emerald-400"
          icon={TrendingUp}
          iconColor="text-emerald-400"
          glow={false}
        />
        <StatCard
          label="Total AI Sessions"
          value="1,204"
          sub="Across all assigned patients"
          valueColor="text-white"
          icon={Brain}
          iconColor="text-cyan-400"
          glow={true}
        />
        <StatCard
          label="Patients at Risk"
          value="3"
          sub="Compliance score below 60%"
          valueColor="text-red-400"
          icon={AlertTriangle}
          iconColor="text-red-400"
          glow={false}
        />
      </div>

      {/* ── Main area chart ── */}
      <GlassCard glow className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">Clinic Adherence — Last 30 Days</h2>
            <p className="text-[11px] text-white/35 mt-0.5">Daily average across all active patients</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 rounded-full">
              Live
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={ADHERENCE_30D} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="rgba(6,182,212,0.8)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0)"   />
              </linearGradient>
            </defs>

            {/* No grid lines per spec */}
            <CartesianGrid vertical={false} horizontal={false} />

            <XAxis
              dataKey="day"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              domain={[40, 100]}
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

        {/* Chart legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-cyan-400 rounded" />
            <span className="text-xs text-white/40">Adherence %</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-white/25">30-day avg:</span>
            <span className="text-xs font-bold text-emerald-400">
              {Math.round(ADHERENCE_30D.reduce((a, b) => a + b.adherence, 0) / ADHERENCE_30D.length)}%
            </span>
          </div>
        </div>
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

          <div className="space-y-3">
            {CONDITIONS.map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white/80 truncate pr-4">{row.condition}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/40">{row.patients} pts</span>
                    <span className="text-xs font-bold text-white">{row.pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
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

          {/* Total */}
          <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/30">Total active patients</span>
            <span className="text-sm font-bold text-white">
              {CONDITIONS.reduce((a, b) => a + b.patients, 0)}
            </span>
          </div>
        </GlassCard>

        {/* Right — Recent Clinic Alerts */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Recent Clinic Alerts</h3>
              <p className="text-[11px] text-white/35">Auto-generated from compliance engine</p>
            </div>
          </div>

          <div className="space-y-3">
            {RECENT_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-xl border-l-2 bg-white/[0.02] border border-white/8 ${
                  alert.urgency === 'critical'
                    ? 'border-l-red-500'
                    : alert.urgency === 'warning'
                      ? 'border-l-amber-500'
                      : 'border-l-cyan-500'
                }`}
              >
                <Activity className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                  alert.urgency === 'critical'
                    ? 'text-red-400'
                    : alert.urgency === 'warning'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 leading-snug">{alert.message}</p>
                  <p className="text-[10px] text-white/25 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
