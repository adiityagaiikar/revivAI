import { Calendar, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const TIMELINE_MOCK = [
  { week: 'Week 1–2', phase: 'Assessment', status: 'pending', tasks: ['Initial range-of-motion test', 'Baseline strength evaluation'] },
  { week: 'Week 3–5', phase: 'Foundation',  status: 'pending', tasks: ['Bodyweight squat protocol', 'Hip flexor stretching routine'] },
  { week: 'Week 6–8', phase: 'Progressive Load', status: 'pending', tasks: ['Resistance band exercises', 'Balance & proprioception drills'] },
]

export default function CarePlanPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Calendar className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Care Plan</h1>
          <p className="text-white/60 mt-1">Timeline and assigned routines from your care team.</p>
        </div>
      </div>

      {/* ── Status banner ── */}
      <GlassCard className="p-4 flex items-center gap-4 border-amber-500/20 bg-amber-500/5">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Awaiting Care Team Assignment</p>
          <p className="text-xs text-white/50 mt-0.5">Your physical therapist will populate this plan after your first consultation.</p>
        </div>
      </GlassCard>

      {/* ── Empty state + preview scaffold ── */}
      <GlassCard className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="relative mb-6">
          <Calendar className="w-16 h-16 text-white/10" />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-[8px] font-bold text-cyan-400">0</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No Active Care Plans</h2>
        <p className="text-white/50 max-w-md text-sm leading-relaxed">
          Your physical therapist has not assigned a dedicated timeline yet. Continue with your general exercises in the meantime.
        </p>
      </GlassCard>

      {/* ── Preview scaffold (shows what it will look like) ── */}
      <div>
        <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3 px-1">Preview — Typical Plan Structure</p>
        <div className="space-y-3">
          {TIMELINE_MOCK.map((phase, i) => (
            <GlassCard key={i} className="p-5 opacity-40 pointer-events-none">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/30 font-medium">{phase.week}</p>
                    <p className="text-sm font-semibold text-white/60 mt-0.5">{phase.phase}</p>
                    <ul className="mt-2 space-y-1">
                      {phase.tasks.map((t, j) => (
                        <li key={j} className="flex items-center gap-1.5 text-xs text-white/25">
                          <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/15 shrink-0 mt-1" />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

    </div>
  )
}
