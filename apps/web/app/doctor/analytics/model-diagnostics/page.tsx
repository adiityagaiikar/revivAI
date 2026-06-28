'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Brain, Activity, BarChart3, Sparkles, ArrowRight } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

type LossPoint = {
  epoch: number
  train_loss: number
  val_loss: number
}

type MetricsResponse = {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  loss_curve: LossPoint[]
}

const DEFAULT_METRICS: MetricsResponse = {
  accuracy: 0.94,
  precision: 0.92,
  recall: 0.95,
  f1_score: 0.93,
  loss_curve: [],
}

function SkeletonCard() {
  return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/3" />
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  accent: 'cyan' | 'violet' | 'emerald' | 'amber'
}) {
  const accentStyles = {
    cyan: 'from-cyan-300 via-cyan-400 to-sky-300 shadow-cyan-500/20 border-cyan-400/20',
    violet: 'from-violet-300 via-fuchsia-400 to-purple-300 shadow-violet-500/20 border-violet-400/20',
    emerald: 'from-emerald-300 via-teal-400 to-cyan-300 shadow-emerald-500/20 border-emerald-400/20',
    amber: 'from-amber-200 via-orange-300 to-rose-300 shadow-orange-500/20 border-orange-400/20',
  }[accent]

  return (
    <GlassCard
      glow
      className="relative overflow-hidden border bg-white/3 p-5"
      style={{ boxShadow: '0 0 36px rgba(34,211,238,0.08)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_40%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">{label}</p>
          <p className={`mt-3 bg-linear-to-r text-4xl font-black tracking-tight ${accentStyles} bg-clip-text text-transparent`}>
            {value}
          </p>
        </div>
        <div className={`rounded-2xl border bg-white/4 p-3 ${accentStyles}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </GlassCard>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md px-4 py-3 text-xs shadow-2xl">
      <p className="text-white/40 mb-1 font-semibold tracking-widest uppercase">Epoch {label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-white/60">Train Loss</span>
          <span className="text-white font-semibold">{payload[0]?.value}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <span className="text-white/60">Val Loss</span>
          <span className="text-white font-semibold">{payload[1]?.value}</span>
        </div>
      </div>
    </div>
  )
}

function ArchitectureNode({
  title,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string
  subtitle: string
  icon: ComponentType<{ className?: string }>
  accent: 'cyan' | 'violet' | 'emerald'
}) {
  const borderClass = {
    cyan: 'border-cyan-400/25 shadow-cyan-500/15',
    violet: 'border-violet-400/25 shadow-violet-500/15',
    emerald: 'border-emerald-400/25 shadow-emerald-500/15',
  }[accent]

  return (
    <div className={`flex-1 rounded-2xl border bg-white/3 p-4 shadow-[0_0_24px_rgba(255,255,255,0.03)] ${borderClass}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

export default function ModelDiagnosticsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('http://localhost:8000/api/metrics', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Metrics request failed with status ${response.status}`)
        }

        const data: MetricsResponse = await response.json()
        setMetrics(data)
      } catch (fetchError: any) {
        if (fetchError?.name !== 'AbortError') {
          setMetrics(DEFAULT_METRICS)
          setError('Live metrics unavailable. Showing fallback values.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    return () => controller.abort()
  }, [])

  const chartData = metrics?.loss_curve ?? []

  const formattedMetrics = useMemo(() => {
    const source = metrics ?? DEFAULT_METRICS
    return [
      { label: 'Accuracy', value: `${Math.round(source.accuracy * 100)}%`, icon: Sparkles, accent: 'cyan' as const },
      { label: 'Precision', value: `${Math.round(source.precision * 100)}%`, icon: Activity, accent: 'violet' as const },
      { label: 'Recall', value: `${Math.round(source.recall * 100)}%`, icon: BarChart3, accent: 'emerald' as const },
      { label: 'F1-Score', value: `${Math.round(source.f1_score * 100)}%`, icon: Brain, accent: 'amber' as const },
    ]
  }, [metrics])

  return (
    <div className="min-h-screen w-full" style={{ background: '#0a0a0a' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.14),transparent_24%)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400/60">Doctor Analytics</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Model Diagnostics</h1>
          <p className="max-w-2xl text-sm text-white/45">
            Live evaluation of the trajectory model powering the recovery prediction pipeline.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : formattedMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  icon={metric.icon}
                  accent={metric.accent}
                />
              ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <GlassCard className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Loss Curve</h2>
                <p className="mt-0.5 text-[11px] text-white/35">Converging train and validation loss over 50 epochs</p>
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                Live Fit
              </span>
            </div>

            <div className="h-90 w-full rounded-2xl border border-white/10 bg-black/20 p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center text-white/35">
                  Loading diagnostic trace…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trainStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#67e8f9" />
                      </linearGradient>
                      <linearGradient id="valStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#d8b4fe" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="epoch"
                      stroke="rgba(255,255,255,0.18)"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.18)"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 'dataMax + 0.15']}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="train_loss"
                      name="train_loss"
                      stroke="url(#trainStroke)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="val_loss"
                      name="val_loss"
                      stroke="url(#valStroke)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Architecture Flow</h2>
                <p className="mt-0.5 text-[11px] text-white/35">Multi-modal ensemble pipeline from signal extraction to prognosis</p>
              </div>
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                Sequential
              </span>
            </div>

            <div className="flex h-90 flex-col justify-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <ArchitectureNode
                title="CNN: X-Ray Scanner"
                subtitle="Extracts spatial degradation cues from imaging signals and builds the first latent representation."
                icon={Sparkles}
                accent="cyan"
              />

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-cyan-300/80">
                  <div className="h-px w-10 bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
                  <ArrowRight className="h-4 w-4" />
                  <div className="h-px w-10 bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
                </div>
              </div>

              <ArchitectureNode
                title="LSTM: Kinematic Tracker"
                subtitle="Models temporal motion sequences and estimates short-term fatigue dynamics from movement history."
                icon={Activity}
                accent="violet"
              />

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-violet-300/80">
                  <div className="h-px w-10 bg-linear-to-r from-transparent via-violet-400 to-transparent" />
                  <ArrowRight className="h-4 w-4" />
                  <div className="h-px w-10 bg-linear-to-r from-transparent via-violet-400 to-transparent" />
                </div>
              </div>

              <ArchitectureNode
                title="ANN: Recovery Predictor"
                subtitle="Combines age, weight, and fatigue risk to estimate personalized recovery timelines."
                icon={Brain}
                accent="emerald"
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}