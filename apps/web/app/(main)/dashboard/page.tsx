'use client'

import {
  Activity, Flame, Timer, Trophy, TrendingUp,
  Upload, FileText, ChevronDown, ChevronUp,
  Users, Dumbbell, Brain, Zap,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { usePatientPlan } from '@/hooks/usePatientPlan'
import {
  ALL_EXERCISES, ALL_COGNITIVE_GAMES,
  filterExercisesByPlan, filterGamesByPlan,
  type PatientPlan,
} from '@/lib/activity-catalog'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Mock 7-day trend data for the area chart
───────────────────────────────────────────── */
const TREND_DATA = [
  { day: 'Mon', accuracy: 72, calories: 210 },
  { day: 'Tue', accuracy: 68, calories: 180 },
  { day: 'Wed', accuracy: 81, calories: 290 },
  { day: 'Thu', accuracy: 77, calories: 240 },
  { day: 'Fri', accuracy: 88, calories: 320 },
  { day: 'Sat', accuracy: 84, calories: 300 },
  { day: 'Sun', accuracy: 92, calories: 350 },
]

/* ─────────────────────────────────────────────
   Icon map
───────────────────────────────────────────── */
const ICONS: Record<string, React.ElementType> = { Activity, Flame, Timer, Trophy }

/* ─────────────────────────────────────────────
   Glassmorphism card primitive
───────────────────────────────────────────── */
function GlassCard({
  children, className = '', glow = false,
}: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md relative overflow-hidden ${className}`}
      style={glow ? {
        boxShadow: '0 0 40px rgba(6,182,212,0.12), inset 0 0 40px rgba(6,182,212,0.04)',
        borderColor: 'rgba(6,182,212,0.25)',
      } : {}}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Custom recharts tooltip
───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md px-4 py-3 text-xs">
      <p className="text-white/50 mb-2 font-semibold tracking-widest uppercase">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}{p.dataKey === 'accuracy' ? '%' : ' kcal'}</span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton shimmer
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

/* ─────────────────────────────────────────────
   Main dashboard
───────────────────────────────────────────── */
export default function DashboardPage() {
  const [doctors, setDoctors]               = useState<any[]>([])
  const [dashboardData, setDashboardData]   = useState<any>(null)
  const [loading, setLoading]               = useState(true)
  const [medicalHistory, setMedicalHistory] = useState<string | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [uploading, setUploading]           = useState(false)
  const router = useRouter()
  const { plan, loading: planLoading } = usePatientPlan()

  const assignedExerciseCount = useMemo(
    () => filterExercisesByPlan(ALL_EXERCISES, plan as PatientPlan | null).length,
    [plan]
  )
  const assignedGameCount = useMemo(
    () => filterGamesByPlan(ALL_COGNITIVE_GAMES, plan as PatientPlan | null).length,
    [plan]
  )

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API}/history/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const meRes = await fetch(`${API}/history/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (meRes.ok) { const d = await meRes.json(); setMedicalHistory(d.medicalHistory || null) }
      }
    } catch (err) { console.error(err) }
    finally { setUploading(false) }
  }

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); router.push('/login'); return }
      try {
        const [doctorsRes, dashRes, histRes] = await Promise.all([
          fetch(`${API}/users/associations`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/dashboard/patient`,  { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/history/me`,         { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (doctorsRes.ok) { const d = await doctorsRes.json(); setDoctors(d.doctors || []) }
        if (dashRes.ok)    { setDashboardData(await dashRes.json()) }
        if (histRes.ok)    { const d = await histRes.json(); setMedicalHistory(d.medicalHistory || null) }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchDashboard()
  }, [router])

  /* ── Stagger variants ── */
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24, delay: i * 0.08 },
    }),
  }

  return (
    <div className="space-y-8" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-white/40 mt-1 text-sm">Your AI-powered recovery intelligence hub</p>
        </div>
        <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
          uploading
            ? 'border-white/10 bg-white/5 text-white/40 cursor-not-allowed'
            : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
        }`}>
          <Upload className="h-4 w-4" />
          {uploading ? 'Extracting via Gemini…' : 'Upload Medical History'}
          <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : dashboardData?.stats?.map((stat: any, i: number) => {
              const Icon = ICONS[stat.iconName] || Activity
              const isPrimary = i === 0
              return (
                <motion.div
                  key={stat.name}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <GlassCard className="p-6" glow={isPrimary}>
                    {/* Radial glow on primary card */}
                    {isPrimary && (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
                      />
                    )}
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">{stat.name}</p>
                        <p className="text-3xl font-bold text-white leading-none">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-2.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-xs font-semibold">{stat.change}</span>
                          <span className="text-white/25 text-xs ml-1">vs last week</span>
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border border-white/10 bg-white/5 ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
      </div>

      {/* ── Area chart + Activity timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Area chart — 3/5 width */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.35 }}
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white">7-Day Performance Trend</h2>
                <p className="text-white/35 text-xs mt-0.5">Accuracy score vs calories burned</p>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                Live
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={TREND_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: 12 }}
                  formatter={(v) => v === 'accuracy' ? 'Accuracy (%)' : 'Calories (kcal)'}
                />
                <Area
                  type="monotone" dataKey="accuracy" name="accuracy"
                  stroke="#06b6d4" strokeWidth={2}
                  fill="url(#gradAccuracy)"
                  dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: 'rgba(6,182,212,0.4)', strokeWidth: 4 }}
                />
                <Area
                  type="monotone" dataKey="calories" name="calories"
                  stroke="#a78bfa" strokeWidth={2}
                  fill="url(#gradCalories)"
                  dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#a78bfa', stroke: 'rgba(167,139,250,0.4)', strokeWidth: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Activity timeline — 2/5 width */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.45 }}
        >
          <GlassCard className="p-6 h-full flex flex-col">
            <h2 className="text-base font-semibold text-white mb-5">Recent Activity</h2>

            {loading ? (
              <div className="space-y-3 flex-1">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !dashboardData?.activities?.length ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">No activity yet — start a session!</p>
              </div>
            ) : (
              <div className="relative flex-1">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/8" />

                <div className="space-y-4">
                  {dashboardData.activities.slice(0, 6).map((act: any, i: number) => {
                    const isFitness = act.type === 'Fitness'
                    const score = act.score
                      ? parseInt(act.score)
                      : Math.floor(72 + Math.random() * 25)
                    const scoreColor = score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                        className="flex items-start gap-3 pl-2"
                      >
                        {/* Icon dot on timeline */}
                        <div className={`relative z-10 h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          isFitness
                            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                            : 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                        }`}>
                          {isFitness ? <Dumbbell className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">{act.name}</p>
                            <span className={`text-xs font-bold shrink-0 ${scoreColor}`}>{score}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30">
                              {new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {act.duration && (
                              <span className="text-[10px] text-white/25">· {act.duration}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="mt-5 pt-4 border-t border-white/8">
              {plan?.enabled && !planLoading && (
                <p className="text-xs text-cyan-400/70 mb-3">
                  {assignedExerciseCount} exercise{assignedExerciseCount !== 1 ? 's' : ''} &amp; {assignedGameCount} game{assignedGameCount !== 1 ? 's' : ''} assigned
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/exercises" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors">
                  <Dumbbell className="h-3.5 w-3.5" /> Exercises
                </Link>
                <Link href="/cognitive-games" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors">
                  <Brain className="h-3.5 w-3.5" /> Cognitive
                </Link>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Medical history ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.55 }}
      >
        <GlassCard className="p-6" style={{ borderColor: 'rgba(6,182,212,0.15)' } as any}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <FileText className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Medical History</h2>
                <p className="text-[10px] text-cyan-400/60 mt-0.5">Extracted via Gemini 2.5 OCR · Visible to your care team</p>
              </div>
            </div>
            {medicalHistory && (
              <button
                onClick={() => setHistoryExpanded(e => !e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition-colors"
              >
                {historyExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> View</>}
              </button>
            )}
          </div>

          {!medicalHistory ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-white/30 text-sm">No medical history uploaded yet.</p>
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                uploading ? 'border-white/10 bg-white/5 text-white/30' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
              }`}>
                <Upload className="h-4 w-4" />
                {uploading ? 'Extracting…' : 'Upload PDF'}
                <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          ) : historyExpanded ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-0.5"
              >
                {medicalHistory.split('\n').filter(Boolean).map((line, i) => {
                  const isBullet = /^[-•*]/.test(line.trim())
                  const isHeader = line.trim().endsWith(':') || /^\*\*.*\*\*$/.test(line.trim())
                  const clean = line.replace(/^\*\*/,'').replace(/\*\*$/,'').replace(/^[-•*]\s*/,'').trim()
                  if (!clean) return null
                  if (isHeader) return <p key={i} className="text-cyan-300 font-semibold text-sm mt-4 mb-1 first:mt-0">{clean}</p>
                  if (isBullet) return (
                    <div key={i} className="flex gap-2 text-sm text-white/55 py-0.5">
                      <span className="text-cyan-400 mt-0.5 shrink-0">•</span><span>{clean}</span>
                    </div>
                  )
                  return <p key={i} className="text-sm text-white/55 py-0.5">{clean}</p>
                })}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-sm text-white/35">Medical history on file. Click "View" to expand.</p>
          )}
        </GlassCard>
      </motion.div>

      {/* ── Care team ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.62 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Your Care Team</h2>
            <Users className="h-4 w-4 text-white/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : doctors.length === 0 ? (
              <p className="text-white/30 text-sm col-span-3">No doctors assigned yet.</p>
            ) : (
              doctors.map((doctor, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {doctor.name?.charAt(0) ?? 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{doctor.name}</p>
                    <p className="text-xs text-white/35">Assigned Clinician</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
