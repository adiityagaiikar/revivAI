'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Play, Square, RotateCcw, Plus, Minus, Clock, Flame, Zap, Activity, Loader2 } from 'lucide-react'
import { ALL_EXERCISES } from '@/lib/activity-catalog'
import { API } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { broadcastTelemetry } from '@/app/actions/telemetry'
import { generateSessionDebrief } from '@/app/actions/ai'

interface PageProps {
  params: { id: string }
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  Intermediate: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  Advanced: 'bg-red-500/15 text-red-400 border border-red-500/25',
  'All Levels': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ExercisePage({ params }: PageProps) {
  const { user } = useAuth()
  const exercise = ALL_EXERCISES.find(e => e.slug === params.id)
  if (!exercise) notFound()

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [reps, setReps] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [debriefMessage, setDebriefMessage] = useState<string | null>(null)

  // Timer
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  
  // ── Telemetry Broadcaster ──
  useEffect(() => {
    if (!running || !user?.id) return;
    
    const intervalId = setInterval(() => {
      // For non-AI exercises, we estimate progress based on elapsed time
      const totalSeconds = parseInt(exercise.duration) * 60 || 300;
      const progress = Math.min(100, Math.round((elapsed / totalSeconds) * 100));
      
      if (elapsed > 0) {
        broadcastTelemetry(user.id, exercise.slug, progress, reps);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [running, user?.id, elapsed, reps, exercise.slug, exercise.duration]);

  const handleStart = () => {
    setShowSummary(false)
    setRunning(true)
  }

  const handleStop = async () => {
    setRunning(false)
    setShowSummary(true)
    setDebriefMessage(null)

    // ── Save session to backend ──
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token && elapsed > 0) {
      setSaving(true)
      setAiGenerating(true)
      
      // Score: simple reps-per-minute efficiency, clamped 0-100
      const minutes = elapsed / 60
      const rawScore = minutes > 0 ? Math.round(Math.min(100, (reps / minutes) * 10)) : 0
      const score = Math.max(0, Math.min(100, rawScore))
      
      try {
        // ── 1. Generate AI Debrief ──
        let clinicalNote = ""
        if (user?.id) {
          const debrief = await generateSessionDebrief(user.id, {
            exerciseName: exercise.name,
            duration: formatTime(elapsed),
            reps: reps,
            score: score
          })
          setDebriefMessage(debrief.patientMessage)
          clinicalNote = debrief.clinicalNote
        }

        // ── 2. Save Session Data + Clinical Note ──
        await fetch(`${API}/dashboard/activity`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: exercise.name,
            type: 'Fitness',
            duration: formatTime(elapsed),
            score: String(score),
            calories: Math.round(exercise.calories * (elapsed / 300)), // pro-rate from 5-min default
            clinicalNote
          }),
        })
      } catch (err) {
        console.error('Failed to save session:', err)
      } finally {
        setSaving(false)
        setAiGenerating(false)
      }
    }
  }

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setReps(0)
    setShowSummary(false)
    setDebriefMessage(null)
  }

  const diffStyle = DIFFICULTY_STYLE[exercise.difficulty] ?? DIFFICULTY_STYLE.Beginner
  const minutes = elapsed / 60

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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{exercise.name}</h1>
            <p className="text-white/40 mt-1 text-sm">{exercise.description}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${diffStyle}`}>
            {exercise.difficulty}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-3 text-sm text-white/40">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{exercise.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span>{exercise.calories} kcal</span>
          </div>
        </div>

        {/* Muscle group chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {exercise.muscleGroups.map(m => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══ Timer / Controls card ══ */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 space-y-6">

          {/* Timer display */}
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <motion.div
              className="text-7xl font-mono font-bold text-white tabular-nums"
              animate={{ scale: running ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 1, repeat: running ? Infinity : 0 }}
              style={{
                textShadow: running ? '0 0 40px rgba(6,182,212,0.4)' : 'none',
              }}
            >
              {formatTime(elapsed)}
            </motion.div>

            {running && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/15">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] font-bold text-red-300 tracking-widest">LIVE</span>
              </div>
            )}
          </div>

          {/* Rep counter */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Reps</p>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setReps(r => Math.max(0, r - 1))}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
              >
                <Minus className="h-4 w-4" />
              </motion.button>

              <span className="text-5xl font-bold text-white w-16 text-center tabular-nums">{reps}</span>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setReps(r => r + 1)}
                className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {!running ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                style={{ boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}
              >
                <Play className="h-4 w-4" />
                Start Session
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
              >
                <Square className="h-4 w-4" />
                Stop
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </motion.button>
          </div>

          {/* Session summary */}
          <AnimatePresence>
            {showSummary && !running && elapsed > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
              >
                <div className="mt-8 space-y-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-6">Session Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-3xl font-bold text-blue-400">{formatTime(elapsed)}</p>
                        <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><Clock className="h-4 w-4"/> Duration</p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-3xl font-bold text-green-400">{reps}</p>
                        <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><Activity className="h-4 w-4"/> Reps</p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-3xl font-bold text-amber-400">{Math.round(exercise.calories * (elapsed / 300))}</p>
                        <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><Flame className="h-4 w-4"/> Calories</p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-3xl font-bold text-purple-400">{minutes > 0 ? Math.round(Math.min(100, (reps / minutes) * 10)) : 0}</p>
                        <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><Zap className="h-4 w-4"/> Score</p>
                      </div>
                    </div>
                  </div>

                  {/* Glowing Purple AI Debrief Card */}
                  {aiGenerating ? (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                      <Loader2 className="animate-spin h-5 w-5 mr-3 text-purple-500" />
                      Gemini is analyzing your session...
                    </div>
                  ) : debriefMessage ? (
                    <div className="p-5 bg-purple-900/20 border border-purple-500/50 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <h3 className="text-purple-300 font-semibold text-sm uppercase tracking-wider">AI Debrief</h3>
                      </div>
                      <p className="text-white text-sm leading-relaxed">{debriefMessage}</p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══ Instructions panel ══ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10">
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Instructions</h2>
          </div>

          {/* Demo GIF */}
          {exercise.gifUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exercise.gifUrl}
                alt={`${exercise.name} demo`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/50 tracking-widest">
                DEMO
              </div>
            </div>
          )}

          {/* Generic instructions for guided exercises */}
          <ol className="space-y-3 flex-1">
            {[
              `Set up in the starting position for ${exercise.name}`,
              'Breathe steadily throughout the movement',
              'Press Start to begin your timed session',
              'Tap + after each completed rep',
              'Press Stop when your set is complete',
            ].map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                className="flex gap-3"
              >
                <span className="shrink-0 w-5 h-5 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {i + 1}
                </span>
                <span className="text-white/60 text-sm leading-relaxed">{step}</span>
              </motion.li>
            ))}
          </ol>

          <div className="pt-4 border-t border-white/8">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Tips</h3>
            <ul className="space-y-1.5">
              {[
                'Focus on form over speed',
                'Rest 60–90 seconds between sets',
                'Track your progress across sessions',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/35">
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-cyan-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
