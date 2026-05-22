'use client'

/**
 * ExerciseShell — Antigravity UI wrapper for all exercise tracking pages.
 *
 * Provides:
 *  - Glassmorphic video container with floating HUD overlays
 *  - Antigravity-styled stats pill (top-left)
 *  - Feedback banner (bottom, emerald/red tinted glass)
 *  - Control bar (Start / Stop / Reset) with framer-motion spring buttons
 *  - Instructions panel (right column)
 *  - Optional session summary card
 *  - Optional score popup (rep flash)
 */

import { useRef, useCallback, useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { calculateFormScore, getScoreColor } from '@/lib/scoring'
import { ALL_EXERCISES } from '@/lib/activity-catalog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, RotateCcw, ArrowLeft,
  VideoOff, Activity, Zap, Download,
} from 'lucide-react'
import Link from 'next/link'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface ExerciseStats {
  reps:      number
  angle:     number
  feedback:  string
  stage?:    string
  holdFrames?: number
}

export interface SessionSummary {
  peakReps:  number
  minAngle?: number
  peakHold?: number
  total:     number
}

export interface InstructionTip {
  text: string
}

export interface ExerciseShellProps {
  /* identity */
  exerciseName: string
  description:  string
  accentColor?: 'violet' | 'cyan' | 'emerald' | 'amber'

  /* state */
  ready:    boolean
  running:  boolean
  stats:    ExerciseStats
  error?:   string
  summary?: SessionSummary | null
  scorePopup?: string | null
  debriefStatus?: 'idle' | 'loading' | 'ready'
  debriefText?: string

  /* content */
  instructions: string[]
  tips?:        string[]
  demoGif?:     string
  extraStats?:  { label: string; value: string | number }[]

  /* callbacks */
  onStart:  () => void
  onStop:   () => void
  onReset:  () => void
  onDownload?: () => void

  /* video / canvas refs passed in from parent */
  videoSlot:  ReactNode   // <video ref={...} /> hidden element
  canvasSlot: ReactNode   // <canvas ref={...} /> — the visible drawing surface
  extraControls?: ReactNode
}

/* ─────────────────────────────────────────────
   Accent palette
───────────────────────────────────────────── */
const ACCENT = {
  violet:  { ring: 'ring-violet-500/30', glow: 'shadow-violet-900/40', icon: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', spin: 'border-violet-500' },
  cyan:    { ring: 'ring-cyan-500/30',   glow: 'shadow-cyan-900/40',   icon: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   spin: 'border-cyan-500'   },
  emerald: { ring: 'ring-emerald-500/30',glow: 'shadow-emerald-900/40',icon: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',spin: 'border-emerald-500'},
  amber:   { ring: 'ring-amber-500/30',  glow: 'shadow-amber-900/40',  icon: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  spin: 'border-amber-500'  },
}

/* ─────────────────────────────────────────────
   Spring button primitive
───────────────────────────────────────────── */
function SpringBtn({
  onClick, disabled = false, children, className = '',
  style,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled  ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </motion.button>
  )
}

/* ─────────────────────────────────────────────
   Main shell
───────────────────────────────────────────── */
export default function ExerciseShell({
  exerciseName, description, accentColor = 'violet',
  ready, running, stats, error, summary, scorePopup, debriefStatus = 'idle', debriefText,
  instructions, tips, demoGif, extraStats,
  onStart, onStop, onReset, onDownload,
  videoSlot, canvasSlot, extraControls,
}: ExerciseShellProps) {
  const ac = ACCENT[accentColor]
  
  const isGoodFeedback = stats.feedback.startsWith('✓')

  // Form Score calculation
  const formScore = calculateFormScore(stats.angle, exerciseName);
  const scoreColor = getScoreColor(formScore);

  // Auto-resolve GIF from catalog
  const catalogMatch = ALL_EXERCISES.find(e => e.name === exerciseName)
  const resolvedDemoGif = demoGif || catalogMatch?.gifUrl

  // Perfect Rep Flare logic
  const [perfectRepFlare, setPerfectRepFlare] = useState(false);
  const lastRepRef = useRef(stats.reps);
  const perfectTriggeredRef = useRef(false);

  useEffect(() => {
    if (stats.reps !== lastRepRef.current) {
      lastRepRef.current = stats.reps;
      perfectTriggeredRef.current = false;
    }

    if (running && formScore === 100 && !perfectTriggeredRef.current) {
      perfectTriggeredRef.current = true;
      setPerfectRepFlare(true);
      setTimeout(() => setPerfectRepFlare(false), 800);
    }
  }, [formScore, stats.reps, running]);


  return (
    <div className="space-y-6" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>

      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/exercises">
            <motion.button
              whileHover={{ x: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </motion.button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{exerciseName}</h1>
        <p className="text-white/40 mt-1 text-sm">{description}</p>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-md text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══ Video card ══ */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-4 space-y-4">

          {/* Video container */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">

            {/* Hidden video element (parent passes this) */}
            {videoSlot}

            {/* Canvas / AI frame */}
            {canvasSlot}

            {/* Idle placeholder */}
            <AnimatePresence>
              {!running && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
                  style={{ background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(8px)' }}
                >
                  {!ready ? (
                    <>
                      <div className={`relative h-12 w-12`}>
                        <div className={`absolute inset-0 rounded-full border-2 ${ac.border} animate-ping opacity-40`} />
                        <div className={`h-12 w-12 rounded-full border-2 ${ac.spin} border-t-transparent animate-spin`} />
                      </div>
                      <p className="text-white/50 text-sm">Loading pose model…</p>
                    </>
                  ) : (
                    <>
                      <div className={`h-14 w-14 rounded-2xl border ${ac.border} ${ac.bg} flex items-center justify-center`}>
                        <VideoOff className={`h-7 w-7 ${ac.icon}`} />
                      </div>
                      <p className="text-white/50 text-sm">Camera off — click Start to begin</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Stats HUD (top-left) ── */}
            <AnimatePresence>
              {running && (
                <motion.div
                  key="stats-hud"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute top-4 left-4 z-30 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                    <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">Reps</span>
                    <span className="text-white font-bold text-xl leading-none">{stats.reps}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                    <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">Angle</span>
                    <span className="text-white font-semibold text-base leading-none">{stats.angle}°</span>
                  </div>
                  {stats.stage && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                      <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">Stage</span>
                      <span className="text-white/80 text-xs capitalize leading-none">{stats.stage}</span>
                    </div>
                  )}
                  {stats.holdFrames !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                      <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">Hold</span>
                      <span className="text-white/80 text-xs leading-none">{stats.holdFrames}f</span>
                    </div>
                  )}
                  {extraStats?.map(s => (
                    <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                      <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">{s.label}</span>
                      <span className="text-white/80 text-xs leading-none">{s.value}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            
            {/* ── Form Score Bar (right side) ── */}
            <AnimatePresence>
              {running && (
                <motion.div
                  key="form-score"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute top-4 right-4 bottom-4 w-12 z-30 flex flex-col items-center justify-end rounded-full border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden py-4"
                >
                  <span className="text-white/60 text-[8px] font-bold tracking-widest absolute top-4">SCORE</span>
                  <div className="w-2 bg-white/10 rounded-full flex-1 mx-auto my-6 relative overflow-hidden flex flex-col justify-end">
                    <motion.div 
                      className="w-full rounded-full transition-colors duration-300"
                      animate={{ height: `${formScore}%`, backgroundColor: scoreColor }}
                      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm" style={{ color: scoreColor }}>{formScore}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Live badge (top-right, shifted left) ── */}

            <AnimatePresence>
              {running && (
                <motion.div
                  key="live-badge"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-4 right-20 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 backdrop-blur-md"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-300 tracking-widest">LIVE</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Feedback banner (bottom) ── */}
            <AnimatePresence>
              {stats.feedback && running && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`absolute bottom-4 left-4 right-4 z-30 px-4 py-2.5 rounded-xl border backdrop-blur-md text-sm font-medium text-center ${
                    isGoodFeedback
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/20 border-red-500/30 text-red-400'
                  }`}
                >
                  {stats.feedback}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Score popup (center flash) ── */}
            <AnimatePresence>
              {scorePopup && running && (
                <motion.div
                  key="score-popup"
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.2, y: -20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
                >
                  <span
                    className="text-5xl font-extrabold"
                    style={{
                      background: 'linear-gradient(135deg, #a78bfa, #67e8f9)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.8))',
                    }}
                  >
                    {scorePopup}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── AI debrief ── */}
          <AnimatePresence>
            {debriefStatus !== 'idle' && (
              <motion.div
                key="ai-debrief"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className={`rounded-2xl border backdrop-blur-md p-6 ${
                  debriefStatus === 'ready'
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_32px_rgba(6,182,212,0.12)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {debriefStatus === 'loading' ? (
                  <div className="flex items-center gap-3 text-white/70">
                    <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <p className="text-sm font-medium tracking-wide animate-pulse">
                      AI Coach is analyzing your biomechanics...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/80">
                      Biomechanical LLM Debrief
                    </p>
                    <p className="text-sm leading-6 text-white/75">
                      {debriefText || 'Your AI coaching summary is ready.'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Control bar ── */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {!running ? (
              <SpringBtn
                onClick={onStart}
                disabled={!ready}
                className={`${ac.bg} ${ac.border} border ${ac.icon} hover:opacity-90`}
                style={{ boxShadow: ready ? `0 0 20px rgba(139,92,246,0.25)` : 'none' } as any}
              >
                <Play className="h-4 w-4" />
                {ready ? 'Start AI Analysis' : 'Loading model…'}
              </SpringBtn>
            ) : (
              <SpringBtn
                onClick={onStop}
                className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
              >
                <Square className="h-4 w-4" />
                Stop
              </SpringBtn>
            )}

            <SpringBtn
              onClick={onReset}
              className="bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </SpringBtn>

            {extraControls}
          </div>

          {/* ── Session summary ── */}
          <AnimatePresence>
            {summary && !running && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="rounded-xl border border-white/10 bg-white/3 backdrop-blur-md p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap className={`h-4 w-4 ${ac.icon}`} />
                  <h3 className="text-white font-semibold text-sm">Session Summary</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className={`text-2xl font-bold ${ac.icon}`}>{summary.peakReps}</p>
                    <p className="text-xs text-white/35 mt-1">Peak Reps</p>
                  </div>
                  {summary.minAngle !== undefined && (
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{summary.minAngle}°</p>
                      <p className="text-xs text-white/35 mt-1">Min Angle</p>
                    </div>
                  )}
                  {summary.peakHold !== undefined && (
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">{summary.peakHold}</p>
                      <p className="text-xs text-white/35 mt-1">Peak Hold (f)</p>
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold text-white/60">{summary.total}</p>
                    <p className="text-xs text-white/35 mt-1">Frames</p>
                  </div>
                </div>
                {onDownload && (
                  <SpringBtn
                    onClick={onDownload}
                    className="w-full mt-4 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 justify-center"
                  >
                    <Download className="h-4 w-4" />
                    Download Session JSON
                  </SpringBtn>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══ Instructions panel ══ */}
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${ac.border} ${ac.bg}`}>
              <Activity className={`h-4 w-4 ${ac.icon}`} />
            </div>
            <h2 className="text-base font-semibold text-white">Instructions</h2>
          </div>

          {/* Optional demo GIF */}
          {resolvedDemoGif && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolvedDemoGif} alt="Exercise demo" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/50 tracking-widest">
                DEMO
              </div>
            </div>
          )}

          <ol className="space-y-3 flex-1">
            {instructions.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                className="flex gap-3"
              >
                <span className={`shrink-0 w-5 h-5 rounded-full border ${ac.border} ${ac.bg} flex items-center justify-center text-[10px] font-bold ${ac.icon}`}>
                  {i + 1}
                </span>
                <span className="text-white/60 text-sm leading-relaxed">{step}</span>
              </motion.li>
            ))}
          </ol>

          {tips && tips.length > 0 && (
            <div className="pt-4 border-t border-white/8">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Tips</h3>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/35">
                    <span className={`mt-0.5 h-1 w-1 rounded-full ${ac.icon} shrink-0`} style={{ background: 'currentColor' }} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
