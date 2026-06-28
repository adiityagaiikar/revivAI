'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Video, PhoneCall, CalendarDays, Send, Loader2, Activity, ShieldAlert, FlaskConical, UserCheck, BellRing, Radio, Zap, AlertTriangle } from 'lucide-react'
import Pusher from 'pusher-js'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'
import { fetchMessages, sendMessage, type ChatMessage } from '@/app/actions/messageActions'

/* ── Channel cards (kept below the chat) ── */
const CHANNELS = [
  {
    icon: Video,
    label: 'Video Consultation',
    description: 'Schedule a live video session with your assigned physiotherapist.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  },
  {
    icon: PhoneCall,
    label: 'Request Callback',
    description: 'Schedule a phone callback from a clinic coordinator within 24 hours.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  },
  {
    icon: CalendarDays,
    label: 'In-Clinic Appointment',
    description: 'Book an in-person slot at your nearest registered clinic location.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
]

/* ── Skeleton shimmer ── */
function MessageSkeleton() {
  return (
    <div className="space-y-4 px-5 py-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
          <div className="h-7 w-7 rounded-full bg-white/8 animate-pulse shrink-0" />
          <div
            className="h-10 rounded-2xl bg-white/8 animate-pulse"
            style={{ width: `${45 + i * 12}%` }}
          />
        </div>
      ))}
    </div>
  )
}

/* ── Typing indicator ── */
function TypingIndicator({ initial }: { initial: string }) {
  return (
    <div className="flex items-end gap-2 max-w-[75%]">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
        {initial}
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/10">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function getTime(isoString?: string): string {
  const date = isoString ? new Date(isoString) : new Date()
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/* ── Live Telemetry types ── */
interface TelemetryPayload {
  recovery_weeks: number | null
  fatigue_index: number | null
  anomaly_alert: boolean
}

/* ── Live Telemetry Feed ── */
function LiveTelemetryFeed() {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const pusherKey     = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

    // Gracefully skip if env vars aren't configured yet
    if (!pusherKey || !pusherCluster) return

    const pusher  = new Pusher(pusherKey, { cluster: pusherCluster })
    const channel = pusher.subscribe('clinic-connect-channel')

    pusher.connection.bind('connected', () => setConnected(true))
    pusher.connection.bind('disconnected', () => setConnected(false))

    channel.bind('live-telemetry', (data: TelemetryPayload) => {
      setTelemetry(data)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('clinic-connect-channel')
      pusher.disconnect()
    }
  }, [])

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
          <Radio className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Live Patient Telemetry</h2>
          <p className="text-white/40 text-sm mt-0.5">Real-time PyTorch inference broadcast via Pusher.</p>
        </div>
        {/* Connection badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${
          connected
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-white/10 bg-white/5 text-white/30'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          {connected ? 'Live' : 'Waiting'}
        </div>
      </div>

      <GlassCard className="p-6">
        {!telemetry ? (
          /* Pre-signal placeholder */
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Radio className="w-8 h-8 text-white/15" />
            <p className="text-white/30 text-sm text-center">
              Waiting for telemetry signal… Start an exercise session to see live data here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Metric pills ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Recovery Weeks */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70">Recovery</p>
                <p className="text-3xl font-extrabold text-cyan-300 leading-none">
                  {telemetry.recovery_weeks != null
                    ? `${telemetry.recovery_weeks.toFixed(1)}`
                    : '—'}
                  <span className="text-sm font-semibold text-cyan-400/60 ml-1">wks</span>
                </p>
              </div>

              {/* Fatigue Index */}
              <div className={`flex flex-col gap-1.5 p-4 rounded-xl border ${
                telemetry.fatigue_index != null && telemetry.fatigue_index > 85
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-violet-500/20 bg-violet-500/10'
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  telemetry.fatigue_index != null && telemetry.fatigue_index > 85
                    ? 'text-red-400/70' : 'text-violet-400/70'
                }`}>Fatigue Index</p>
                <p className={`text-3xl font-extrabold leading-none ${
                  telemetry.fatigue_index != null && telemetry.fatigue_index > 85
                    ? 'text-red-300' : 'text-violet-300'
                }`}>
                  {telemetry.fatigue_index != null
                    ? `${telemetry.fatigue_index.toFixed(1)}`
                    : '—'}
                  <span className="text-sm font-semibold opacity-60 ml-1">/100</span>
                </p>
              </div>

              {/* Anomaly Alert */}
              <div className={`flex flex-col gap-1.5 p-4 rounded-xl border ${
                telemetry.anomaly_alert
                  ? 'border-yellow-500/40 bg-yellow-500/10'
                  : 'border-emerald-500/20 bg-emerald-500/10'
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  telemetry.anomaly_alert ? 'text-yellow-400/70' : 'text-emerald-400/70'
                }`}>Anomaly</p>
                <p className={`text-xl font-extrabold leading-none flex items-center gap-2 ${
                  telemetry.anomaly_alert ? 'text-yellow-300' : 'text-emerald-300'
                }`}>
                  {telemetry.anomaly_alert
                    ? <><AlertTriangle className="w-5 h-5" /> Detected</>
                    : <><Zap className="w-5 h-5" /> Clear</>}
                </p>
              </div>
            </div>

            {/* ── Danger banners ── */}
            <div className="flex flex-col gap-2">
              {telemetry.fatigue_index != null && telemetry.fatigue_index > 85 && (
                <div className="w-full px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/10 backdrop-blur-md text-red-400 text-sm font-medium">
                  ⚠️ Muscle Fatigue Detected: Form degrading ({telemetry.fatigue_index.toFixed(0)}%). Terminate set to prevent injury.
                </div>
              )}
              {telemetry.anomaly_alert && (
                <div className="w-full px-4 py-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 backdrop-blur-md text-yellow-400 text-sm font-medium">
                  ⚡ Kinematic Anomaly Detected: Check spinal alignment and joint trajectory.
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

/* ── Risk Assessment types ── */
interface RiskFormData {
  age: number
  weight: number
  baseline_mobility_score: number
  avg_peak_angle: number
}

interface RiskResult {
  risk_percentage: number
  risk_category: 'Low Risk' | 'Moderate Risk' | 'Critical Risk'
  recommendation: string
}

const RISK_PALETTE = {
  'Low Risk': {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: '0 0 32px rgba(16,185,129,0.20)',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  'Moderate Risk': {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    glow: '0 0 32px rgba(234,179,8,0.20)',
    badge: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    dot: 'bg-yellow-400',
  },
  'Critical Risk': {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    glow: '0 0 32px rgba(239,68,68,0.20)',
    badge: 'bg-red-500/15 border-red-500/30 text-red-300',
    dot: 'bg-red-400',
  },
}

/* ── Risk Assessment Panel ── */
function RiskAssessmentPanel() {
  const [formData, setFormData] = useState<RiskFormData>({
    age: 45,
    weight: 80.0,
    baseline_mobility_score: 60.0,
    avg_peak_angle: 85.0,
  })
  const [assessmentResult, setAssessmentResult] = useState<RiskResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }))
  }

  const analyzeRisk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/clinical/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: RiskResult = await res.json()
      setAssessmentResult(data)
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to reach the analysis server.')
    } finally {
      setIsLoading(false)
    }
  }

  const palette = assessmentResult ? RISK_PALETTE[assessmentResult.risk_category] : null

  const FIELDS: { name: keyof RiskFormData; label: string; unit: string; min: number; max: number; step: number }[] = [
    { name: 'age',                    label: 'Patient Age',          unit: 'yrs',  min: 0,   max: 120, step: 1     },
    { name: 'weight',                 label: 'Body Weight',          unit: 'kg',   min: 0,   max: 300, step: 0.1   },
    { name: 'baseline_mobility_score',label: 'Baseline Mobility',    unit: '/100', min: 0,   max: 100, step: 0.1   },
    { name: 'avg_peak_angle',         label: 'Avg. Peak Joint Angle',unit: '°',    min: 0,   max: 360, step: 0.1   },
  ]

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10">
          <FlaskConical className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Clinical Risk Assessment</h2>
          <p className="text-white/40 text-sm mt-0.5">ANN-powered re-injury prediction for clinical decision support.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left: Input form ── */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">Patient Data</h3>
          <form onSubmit={analyzeRisk} className="space-y-4">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label htmlFor={field.name} className="text-xs font-semibold text-white/50 tracking-wide">
                  {field.label}
                  <span className="ml-1.5 text-white/25 font-normal">{field.unit}</span>
                </label>
                <div className="relative">
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 focus:bg-white/8 transition-colors appearance-none"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25 pointer-events-none select-none">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}

            {apiError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all
                bg-violet-600/80 border border-violet-500/40 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-[0_0_24px_rgba(139,92,246,0.30)] hover:shadow-[0_0_36px_rgba(139,92,246,0.50)]"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><ShieldAlert className="w-4 h-4" /> Run Deep Dive Risk Analysis</>
              )}
            </button>
          </form>
        </GlassCard>

        {/* ── Right: Result ── */}
        {assessmentResult && palette ? (
          <GlassCard
            className={`p-6 flex flex-col justify-between ${palette.border} ${palette.bg}`}
            style={{ boxShadow: palette.glow } as React.CSSProperties}
          >
            {/* Risk badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${palette.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${palette.dot} animate-pulse`} />
                {assessmentResult.risk_category}
              </span>
            </div>

            {/* Big percentage */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
              <p className={`text-7xl font-extrabold leading-none tracking-tight ${palette.text}`}
                style={{ textShadow: palette.glow }}
              >
                {assessmentResult.risk_percentage.toFixed(1)}
                <span className="text-3xl font-bold opacity-60">%</span>
              </p>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mt-1">Re-injury risk score</p>
            </div>

            {/* Recommendation */}
            <div className={`mt-4 p-4 rounded-xl border ${palette.border} bg-white/5`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1">AI Recommendation</p>
              <div className="flex items-start gap-2">
                <Activity className={`w-4 h-4 mt-0.5 shrink-0 ${palette.text}`} />
                <p className="text-sm text-white/80 leading-relaxed">{assessmentResult.recommendation}</p>
              </div>
            </div>
          </GlassCard>
        ) : (
          /* Placeholder before first run */
          <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 border-dashed border-white/10 opacity-50">
            <ShieldAlert className="w-10 h-10 text-white/20" />
            <p className="text-white/30 text-sm text-center leading-relaxed">
              Fill in the patient data and run the analysis to see the AI risk assessment here.
            </p>
          </GlassCard>
        )}

      </div>
    </div>
  )
}

/* ── Adherence types ── */
interface AdherenceFormData {
  days_since_last_session: number
  total_sessions_completed: number
  set_completion_rate: number
}

interface AdherenceResult {
  dropout_probability: number
  engagement_status: 'Highly Engaged' | 'Waning Engagement' | 'High Flight Risk'
  recommended_action: string
}

const ADHERENCE_PALETTE = {
  'Highly Engaged': {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: '0 0 32px rgba(16,185,129,0.20)',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    dot: 'bg-emerald-400',
    actionHighlight: false,
  },
  'Waning Engagement': {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    glow: '0 0 32px rgba(234,179,8,0.20)',
    badge: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    dot: 'bg-yellow-400',
    actionHighlight: false,
  },
  'High Flight Risk': {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    glow: '0 0 32px rgba(239,68,68,0.20)',
    badge: 'bg-red-500/15 border-red-500/30 text-red-300',
    dot: 'bg-red-400',
    actionHighlight: true,
  },
}

/* ── Adherence Panel ── */
function AdherencePanel() {
  const [adherenceData, setAdherenceData] = useState<AdherenceFormData>({
    days_since_last_session: 8,
    total_sessions_completed: 3,
    set_completion_rate: 65.0,
  })
  const [adherenceResult, setAdherenceResult] = useState<AdherenceResult | null>(null)
  const [isAdherenceLoading, setIsAdherenceLoading] = useState(false)
  const [adherenceError, setAdherenceError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdherenceData((prev) => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }))
  }

  const analyzeAdherence = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdherenceLoading(true)
    setAdherenceError(null)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/clinical/predict-adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adherenceData),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: AdherenceResult = await res.json()
      setAdherenceResult(data)
    } catch (err: any) {
      setAdherenceError(err.message ?? 'Failed to reach the analysis server.')
    } finally {
      setIsAdherenceLoading(false)
    }
  }

  const palette = adherenceResult ? ADHERENCE_PALETTE[adherenceResult.engagement_status] : null

  const FIELDS: { name: keyof AdherenceFormData; label: string; unit: string; min: number; max: number; step: number }[] = [
    { name: 'days_since_last_session',  label: 'Days Since Last Session',  unit: 'days', min: 0, max: 365, step: 1   },
    { name: 'total_sessions_completed', label: 'Total Sessions Completed', unit: 'sess', min: 0, max: 500, step: 1   },
    { name: 'set_completion_rate',      label: 'Set Completion Rate',      unit: '%',    min: 0, max: 100, step: 0.1 },
  ]

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <UserCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Adherence Predictor</h2>
          <p className="text-white/40 text-sm mt-0.5">ANN-powered patient drop-out probability from behavioural signals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left: Input form ── */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">Behavioural Data</h3>
          <form onSubmit={analyzeAdherence} className="space-y-4">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label htmlFor={`adherence-${field.name}`} className="text-xs font-semibold text-white/50 tracking-wide">
                  {field.label}
                  <span className="ml-1.5 text-white/25 font-normal">{field.unit}</span>
                </label>
                <div className="relative">
                  <input
                    id={`adherence-${field.name}`}
                    name={field.name}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={adherenceData[field.name]}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-colors appearance-none"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25 pointer-events-none select-none">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}

            {adherenceError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {adherenceError}
              </p>
            )}

            <button
              type="submit"
              disabled={isAdherenceLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all
                bg-cyan-600/80 border border-cyan-500/40 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-[0_0_24px_rgba(6,182,212,0.30)] hover:shadow-[0_0_36px_rgba(6,182,212,0.50)]"
            >
              {isAdherenceLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><UserCheck className="w-4 h-4" /> Run Adherence Prediction</>
              )}
            </button>
          </form>
        </GlassCard>

        {/* ── Right: Result ── */}
        {adherenceResult && palette ? (
          <GlassCard
            className={`p-6 flex flex-col justify-between ${palette.border} ${palette.bg}`}
            style={{ boxShadow: palette.glow } as React.CSSProperties}
          >
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${palette.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${palette.dot} animate-pulse`} />
                {adherenceResult.engagement_status}
              </span>
            </div>

            {/* Big percentage */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
              <p
                className={`text-7xl font-extrabold leading-none tracking-tight ${palette.text}`}
                style={{ textShadow: palette.glow }}
              >
                {adherenceResult.dropout_probability.toFixed(1)}
                <span className="text-3xl font-bold opacity-60">%</span>
              </p>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mt-1">Drop-out probability</p>
            </div>

            {/* Recommended action — highlighted in red for High Flight Risk */}
            <div className={`mt-4 p-4 rounded-xl border ${
              palette.actionHighlight
                ? 'border-red-500/50 bg-red-500/15'
                : `${palette.border} bg-white/5`
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1">Recommended Action</p>
              <div className="flex items-start gap-2">
                <BellRing className={`w-4 h-4 mt-0.5 shrink-0 ${palette.text}`} />
                <p className={`text-sm leading-relaxed font-semibold ${
                  palette.actionHighlight ? 'text-red-300' : 'text-white/80'
                }`}>
                  {adherenceResult.recommended_action}
                </p>
              </div>
            </div>
          </GlassCard>
        ) : (
          /* Placeholder before first run */
          <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 border-dashed border-white/10 opacity-50">
            <UserCheck className="w-10 h-10 text-white/20" />
            <p className="text-white/30 text-sm text-center leading-relaxed">
              Enter behavioural data and run the prediction to see the engagement analysis here.
            </p>
          </GlassCard>
        )}

      </div>
    </div>
  )
}

/* ── Main page ── */
export default function ClinicConnectPage() {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [doctor,   setDoctor]     = useState<{ _id: string; name: string; specialties?: string[] } | null>(null)
  const [myId,     setMyId]       = useState<string | null>(null)
  const [input,    setInput]      = useState('')
  const [sending,  setSending]    = useState(false)
  const [loadingChat, setLoadingChat] = useState(true)
  const [error,    setError]      = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const doctorRef = useRef<string | null>(null) // tracks doctorId for polling closure

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Fetch messages silently (for polling) ── */
  const refreshMessages = useCallback(async () => {
    const docId = doctorRef.current
    if (!docId) return
    try {
      const fresh = await fetchMessages(docId)
      setMessages(fresh)
    } catch { /* silent */ }
  }, [])

  /* ── Load doctor + message history on mount ── */
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoadingChat(false); return }

      try {
        // 1. Get logged-in user id
        const meRes = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!meRes.ok || cancelled) return
        const me = await meRes.json()
        if (cancelled) return
        setMyId(me.id ?? me._id)

        // 2. Get assigned doctor via /users/associations
        const assocRes = await fetch(`${API}/users/associations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!assocRes.ok || cancelled) return
        const assoc = await assocRes.json()
        if (cancelled) return

        const assignedDoctor = assoc.doctors?.[0] ?? null
        if (!assignedDoctor) {
          setLoadingChat(false)
          return
        }
        setDoctor(assignedDoctor)
        doctorRef.current = assignedDoctor._id ?? assignedDoctor.id

        // 3. Fetch message history
        const history = await fetchMessages(assignedDoctor._id ?? assignedDoctor.id)
        if (!cancelled) setMessages(history)
      } catch (err) {
        if (!cancelled) setError('Could not load chat. Please try again.')
      } finally {
        if (!cancelled) setLoadingChat(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  /* ── 3-second polling once doctor is loaded ── */
  useEffect(() => {
    if (!doctor) return

    // Start polling
    pollRef.current = setInterval(refreshMessages, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [doctor, refreshMessages])

  /* ── Send handler ── */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const text = input.trim()
      if (!text || !doctor || sending) return

      setSending(true)
      setInput('')

      // Optimistic update — add a temporary message
      const optimisticId = `optimistic-${Date.now()}`
      const optimistic: ChatMessage = {
        _id: optimisticId,
        sender: { _id: myId ?? '', name: 'Me', role: 'patient' },
        receiver: { _id: doctor._id, name: doctor.name, role: 'doctor' },
        text,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])

      try {
        const doctorId = doctor._id ?? (doctor as any).id
        const saved = await sendMessage(doctorId, text)
        // Replace optimistic with real saved message
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== optimisticId),
          saved,
        ])
      } catch (err: any) {
        // Rollback on failure
        setMessages((prev) => prev.filter((m) => m._id !== optimisticId))
        setError(err.message ?? 'Failed to send message.')
        setInput(text)
      } finally {
        setSending(false)
      }
    },
    [input, doctor, sending, myId]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  /* ── Derived ── */
  const doctorInitial = doctor?.name?.charAt(0)?.toUpperCase() ?? 'D'
  const doctorFirstName = doctor?.name?.split(' ').find(w => w !== 'Dr.') ?? doctor?.name ?? '—'
  const doctorSpecialty = doctor?.specialties?.[0] ?? 'Assigned Clinician'

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clinic Connect</h1>
          <p className="text-white/60 mt-1">Secure, real-time communication with your clinical care team.</p>
        </div>
        {/* Live polling indicator */}
        {doctor && !loadingChat && (
          <div className="ml-auto flex items-center gap-2 text-xs text-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {/* ── Chat window ── */}
      <GlassCard glow className="flex flex-col" style={{ height: '520px' }}>

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          {loadingChat ? (
            <div className="flex items-center gap-3 w-full">
              <div className="h-9 w-9 rounded-full bg-white/8 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-28 rounded bg-white/8 animate-pulse" />
                <div className="h-2.5 w-40 rounded bg-white/8 animate-pulse" />
              </div>
            </div>
          ) : !doctor ? (
            <p className="text-sm text-white/40">No doctor assigned yet.</p>
          ) : (
            <>
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white">
                  {doctorInitial}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{doctor.name}</p>
                <p className="text-[11px] text-emerald-400">Online · {doctorSpecialty}</p>
              </div>
            </>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {loadingChat ? (
            <MessageSkeleton />
          ) : !doctor ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="text-center space-y-2">
                <MessageSquare className="h-8 w-8 text-white/15 mx-auto" />
                <p className="text-white/30 text-sm">No doctor assigned to your account yet.</p>
                <p className="text-white/20 text-xs">Ask your clinic to assign a physiotherapist.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                </div>
                <p className="text-white/50 text-sm font-medium">Start the conversation</p>
                <p className="text-white/25 text-xs mt-1">
                  Send your first message to {doctor.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender._id === myId || (msg.sender as any).id === myId
                const senderInitial = msg.sender.name?.charAt(0)?.toUpperCase() ?? '?'
                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    {!isMe ? (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
                        {senderInitial}
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70 shrink-0 mb-1">
                        You
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : ''} flex flex-col gap-1`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'rounded-br-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white'
                            : 'rounded-bl-sm bg-white/8 border border-white/10 text-white/85'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-white/25 px-1">{getTime(msg.timestamp)}</span>
                    </div>
                  </div>
                )
              })}

              {/* Optimistic typing indicator while sending */}
              {sending && <TypingIndicator initial={doctorInitial} />}

              <div ref={bottomRef} />
            </div>
          )}

          {!loadingChat && messages.length > 0 && <div ref={bottomRef} />}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
            <button
              className="ml-2 underline hover:text-red-200"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-4 py-3 border-t border-white/8 shrink-0"
        >
          <input
            id="clinic-connect-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!doctor || loadingChat || sending}
            placeholder={
              !doctor
                ? 'No doctor assigned yet…'
                : `Type a message to ${doctorFirstName}…`
            }
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-colors disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || !doctor || sending}
            id="clinic-connect-send"
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/8 disabled:text-white/20 text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] disabled:shadow-none shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </GlassCard>

      {/* ── Other channels ── */}
      <div>
        <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3 px-1">Other Channels</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <GlassCard key={ch.label} className="p-5 flex items-start gap-4 opacity-60 pointer-events-none">
                <div className={`p-2.5 rounded-xl border ${ch.bg} ${ch.border} shrink-0`}>
                  <Icon className={`w-5 h-5 ${ch.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{ch.label}</p>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${ch.badgeColor}`}>
                      {ch.badge}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{ch.description}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>

      {/* ── Live Patient Telemetry ── */}
      <div className="pt-2">
        <LiveTelemetryFeed />
      </div>

      {/* ── Clinical Risk Assessment ── */}
      <div className="pt-2">
        <RiskAssessmentPanel />
      </div>

      {/* ── Adherence Predictor ── */}
      <div className="pt-2">
        <AdherencePanel />
      </div>

    </div>
  )
}
