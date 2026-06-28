'use client'

import { Card } from "@workspace/ui/components/card"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { BarChart3, TrendingUp, TrendingDown, Activity, Calendar, Target, Download } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/lib/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line
} from 'recharts'
import { getGameScores } from "../cognitive-games/utils/gameScores"
import { API } from '@/lib/api'
import { getScopedStorageKey } from '@/lib/storage-scope'

// ── Types ─────────────────────────────────────────────────────────────────────
type HandFoldingAvg  = { session: number; avgAngle: number; totalScore: number; date: string }
type SquatAvg        = { session: number; avgAngle: number; totalReps: number;  date: string }

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadJSON<T>(key: string, fallback: T, scopeId?: string | null): T {
  const scopedKey = getScopedStorageKey(key, scopeId)
  try { return JSON.parse(localStorage.getItem(scopedKey) ?? 'null') ?? fallback } catch { return fallback }
}

// ── Client-side PDF via print window ─────────────────────────────────────────
function buildPrintHTML(
  handHistory:    HandFoldingAvg[],
  squatHistory:   SquatAvg[],
  patternScores:  { score: number; date: string; label?: string }[],
  stroopScores:   { score: number; date: string; label?: string }[],
): string {
  const ts = new Date().toLocaleString()

  const tableRows = (rows: string[][]) =>
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')

  const handRows = handHistory.map(h => [
    `Session ${h.session}`, h.date, `${h.avgAngle}°`, `${h.totalScore} pts`
  ])
  const squatRows = squatHistory.map(s => [
    `Session ${s.session}`, s.date, `${s.avgAngle}°`, `${s.totalReps} reps`
  ])
  const patternRows = patternScores.slice(-10).map((s, i) => [
    `#${i + 1}`, new Date(s.date).toLocaleDateString(), `${s.score}%`, s.label ?? '—'
  ])
  const stroopRows = stroopScores.slice(-10).map((s, i) => [
    `#${i + 1}`, new Date(s.date).toLocaleDateString(), `${s.score}%`, s.label ?? '—'
  ])

  const peakHandScore  = handHistory.length  ? Math.max(...handHistory.map(h => h.totalScore))  : '—'
  const bestHandAngle  = handHistory.length  ? Math.min(...handHistory.map(h => h.avgAngle))    : '—'
  const peakSquatReps  = squatHistory.length ? Math.max(...squatHistory.map(s => s.totalReps))  : '—'
  const bestPatternPct = patternScores.length ? Math.max(...patternScores.map(s => s.score))    : '—'
  const bestStroopPct  = stroopScores.length  ? Math.max(...stroopScores.map(s => s.score))     : '—'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>RevivAI Patient Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; }
  h1 { font-size: 26px; color: #1e3a8a; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 28px; }
  h2 { font-size: 16px; color: #1e3a8a; margin: 24px 0 10px; border-bottom: 2px solid #dbeafe; padding-bottom: 4px; }
  h3 { font-size: 13px; color: #475569; margin: 16px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 8px; }
  .stat-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-val { font-size: 22px; font-weight: 700; color: #1e3a8a; }
  .stat-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
  .empty { color: #94a3b8; font-style: italic; font-size: 13px; padding: 8px 0; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>RevivAI — Patient Progress Report</h1>
<p class="subtitle">Generated: ${ts}</p>

<h2>Summary</h2>
<div class="summary-grid">
  <div class="stat-box"><div class="stat-val">${handHistory.length}</div><div class="stat-lbl">Hand Folding Sessions</div></div>
  <div class="stat-box"><div class="stat-val">${peakHandScore}</div><div class="stat-lbl">Peak Hand Score (pts)</div></div>
  <div class="stat-box"><div class="stat-val">${bestHandAngle}${typeof bestHandAngle === 'number' ? '°' : ''}</div><div class="stat-lbl">Best Elbow Angle</div></div>
  <div class="stat-box"><div class="stat-val">${peakSquatReps}</div><div class="stat-lbl">Peak Squat Reps</div></div>
  <div class="stat-box"><div class="stat-val">${bestPatternPct}${typeof bestPatternPct === 'number' ? '%' : ''}</div><div class="stat-lbl">Best Pattern Matrix</div></div>
</div>

<h2>Exercise: Hand Folding (Elbow Flexion)</h2>
${handHistory.length === 0
  ? '<p class="empty">No hand folding sessions recorded yet.</p>'
  : `<table><thead><tr><th>Session</th><th>Date</th><th>Avg Angle</th><th>Peak Score</th></tr></thead><tbody>${tableRows(handRows)}</tbody></table>`
}

<h2>Exercise: Squats</h2>
${squatHistory.length === 0
  ? '<p class="empty">No squat sessions recorded yet.</p>'
  : `<table><thead><tr><th>Session</th><th>Date</th><th>Avg Angle</th><th>Peak Reps</th></tr></thead><tbody>${tableRows(squatRows)}</tbody></table>`
}

<h2>Cognitive Game: Pattern Matrix</h2>
${patternScores.length === 0
  ? '<p class="empty">No Pattern Matrix scores recorded yet.</p>'
  : `<table><thead><tr><th>#</th><th>Date</th><th>Score</th><th>Level</th></tr></thead><tbody>${tableRows(patternRows)}</tbody></table>`
}

<h2>Cognitive Game: Stroop Effect</h2>
${stroopScores.length === 0
  ? '<p class="empty">No Stroop Effect scores recorded yet.</p>'
  : `<table><thead><tr><th>#</th><th>Date</th><th>Score</th><th>Detail</th></tr></thead><tbody>${tableRows(stroopRows)}</tbody></table>`
}

<div class="footer">
  RevivAI Rehabilitation Platform · Data sourced from patient device · Best Stroop score: ${bestStroopPct}${typeof bestStroopPct === 'number' ? '%' : ''}
</div>
</body>
</html>`
}

export default function OverallAnalysisPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isExporting,   setIsExporting]   = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [weeklyData, setWeeklyData] = useState<{ day: string; workouts: number; games: number }[]>(
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, workouts: 0, games: 0 }))
  )
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  // ── Load localStorage data ──────────────────────────────────────────────────
  const handHistory   = useMemo<HandFoldingAvg[]>(() => loadJSON('hand-folding-session-history', [], user?.id), [user?.id])
  const squatHistory  = useMemo<SquatAvg[]>(()       => loadJSON('squats-session-history', [], user?.id),       [user?.id])
  const patternScores = useMemo(() => getGameScores('pattern-matrix'), [user?.id])
  const stroopScores  = useMemo(() => getGameScores('stroop-effect'),  [user?.id])

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/patient`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setDashboardData(await res.json())
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    fetchDashboard()
  }, [router])

  useEffect(() => {
    const fetchWeekly = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setWeeklyLoading(false); return }
      try {
        const res = await fetch(`${API}/dashboard/weekly-activity`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length === 7) {
            setWeeklyData(data)
          }
        }
      } catch { /* network error — weeklyData stays zero-initialised */ } finally {
        setWeeklyLoading(false)
      }
    }
    fetchWeekly()
  }, [])

  const handleDownloadPDF = () => {
    setIsExporting(true)
    try {
      const html = buildPrintHTML(handHistory, squatHistory, patternScores, stroopScores)
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) { alert('Allow popups to export PDF.'); return }
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 600)
    } finally {
      setIsExporting(false)
    }
  }

  const analytics = dashboardData?.stats ? [
    { label: dashboardData.stats[0]?.name || 'Consistency',  value: dashboardData.stats[0]?.value || '85',    change: '+5%',  trend: 'up' },
    { label: 'Cognitive Attempts',                            value: dashboardData.activities?.filter((a: any) => a.type === 'Cognitive').length * 4 + 17 || 64, change: '+12', trend: 'up' },
    { label: 'Active Minutes',                                value: dashboardData.stats[2]?.value || '340',   change: '+15%', trend: 'up' },
    { label: 'Total Calories',                                value: dashboardData.stats[1]?.value || '12450', change: '+8%',  trend: 'up' },
  ] : []

  const tooltipStyle = { backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: 12 }

  return (
    <div className="space-y-8">
      <div className="relative">
        <Spotlight className="-top-20 left-0" fill="white" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Overall Analysis</h1>
            <p className="text-neutral-400">Comprehensive view of your fitness and cognitive progress</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium rounded-lg border border-white/10 transition-colors"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Preparing...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-400 animate-pulse text-xl">Loading comprehensive report...</p>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics.map((stat: any, i: number) => (
              <Card key={i} className="bg-black/[0.96] border-white/10 p-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-neutral-400 text-sm">{stat.label}</p>
                  {stat.trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>{stat.change} vs last month</p>
              </Card>
            ))}
          </div>

          {/* Weekly Activity Chart */}
          <Card className="bg-black/[0.96] border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-5 w-5 text-neutral-400" />
              <h2 className="text-xl font-semibold text-white">Weekly Activity Profile</h2>
            </div>
            {weeklyLoading ? (
              <div className="h-[260px] rounded-xl bg-white/5 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                  <Legend />
                  <Bar dataKey="workouts" name="Workouts"       fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="games"    name="Cognitive Games" fill="#a855f7" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* ── Exercise Improvement Graphs ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Hand Folding — Session Progress</h2>
              </div>
              {handHistory.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No hand folding sessions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={handHistory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="session" stroke="#555" fontSize={11} tickFormatter={v => `S${v}`} />
                    <YAxis yAxisId="score" stroke="#3b82f6" fontSize={11} domain={[0, 2000]} />
                    <YAxis yAxisId="angle" orientation="right" stroke="#22c55e" fontSize={11} domain={[0, 180]} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: any, n: any) => [n === 'totalScore' ? `${v} pts` : `${v}°`, n === 'totalScore' ? 'Peak Score' : 'Avg Angle']}
                      labelFormatter={l => `Session ${l}`}
                    />
                    <Legend formatter={v => v === 'totalScore' ? 'Peak Score' : 'Avg Angle'} wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="score" type="monotone" dataKey="totalScore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="angle" type="monotone" dataKey="avgAngle"   stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Squats — Session Progress</h2>
              </div>
              {squatHistory.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No squat sessions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={squatHistory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="session" stroke="#555" fontSize={11} tickFormatter={v => `S${v}`} />
                    <YAxis yAxisId="reps"  stroke="#a855f7" fontSize={11} />
                    <YAxis yAxisId="angle" orientation="right" stroke="#22c55e" fontSize={11} domain={[0, 180]} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: any, n: any) => [n === 'totalReps' ? `${v} reps` : `${v}°`, n === 'totalReps' ? 'Peak Reps' : 'Avg Angle']}
                      labelFormatter={l => `Session ${l}`}
                    />
                    <Legend formatter={v => v === 'totalReps' ? 'Peak Reps' : 'Avg Angle'} wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="reps"  type="monotone" dataKey="totalReps" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="angle" type="monotone" dataKey="avgAngle"  stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Cognitive Game Improvement Graphs ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Pattern Matrix — Score Trend</h2>
              </div>
              {patternScores.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No Pattern Matrix scores yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={patternScores.map((s, i) => ({ attempt: i + 1, score: s.score, label: s.label }))}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="attempt" stroke="#555" fontSize={11} tickFormatter={v => `#${v}`} />
                    <YAxis stroke="#eab308" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: any) => [`${v}%`, 'Score']}
                      labelFormatter={l => `Attempt #${l}`}
                    />
                    <Line type="monotone" dataKey="score" stroke="#eab308" strokeWidth={2} dot={{ r: 4, fill: '#eab308' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-pink-400" />
                <h2 className="text-lg font-semibold text-white">Stroop Effect — Score Trend</h2>
              </div>
              {stroopScores.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No Stroop Effect scores yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={stroopScores.map((s, i) => ({ attempt: i + 1, score: s.score }))}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="attempt" stroke="#555" fontSize={11} tickFormatter={v => `#${v}`} />
                    <YAxis stroke="#ec4899" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: any) => [`${v}%`, 'Score']}
                      labelFormatter={l => `Attempt #${l}`}
                    />
                    <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={2} dot={{ r: 4, fill: '#ec4899' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Target className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Monthly Goals</h3>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Complete 30 Workouts',    current: dashboardData?.stats?.[0]?.value || 0,                                                                    target: 30,    color: 'bg-blue-400' },
                  { label: 'Play 50 Cognitive Games', current: dashboardData?.activities?.filter((a: any) => a.type === 'Cognitive').length * 4 + 17 || 0,               target: 50,    color: 'bg-purple-400' },
                  { label: 'Burn 15,000 Calories',    current: parseInt(dashboardData?.stats?.[1]?.value?.replace(/,/g, '') || '0'),                                      target: 15000, color: 'bg-orange-400' },
                ].map(goal => (
                  <div key={goal.label}>
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-300">{goal.label}</span>
                      <span className="text-white font-medium">{goal.current} / {goal.target}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${goal.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-black/[0.96] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Streak Summary Tracker</h3>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-center text-sm text-neutral-500 mb-2">{d}</div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const active = [0,1,3,4,6,8,9,10,12,14,15,17,18,20,21,23,24,26,27].includes(i)
                  const rest   = [2,5,11,16,19,22,25].includes(i)
                  return (
                    <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                      active ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      rest   ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                               'bg-white/5 text-neutral-500 border border-white/5'
                    }`}>{i + 1}</div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-6 text-sm justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" /><span className="text-neutral-400 font-medium">Active</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" /><span className="text-neutral-400 font-medium">Rest</span></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
