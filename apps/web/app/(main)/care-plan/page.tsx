'use client'

import { useState, useMemo } from 'react'
import { Calendar, Play, CheckCircle2, Circle, Activity, TrendingUp, User } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

/* ─────────────────────────────────────────────
   Mock data — 7-day weekly routine
───────────────────────────────────────────── */
type Exercise = {
  id: string
  name: string
  slug: string
  targetReps: number
  completed: boolean
}

type DayPlan = {
  day: string
  date: string
  exercises: Exercise[]
}

const PATIENT = {
  name: 'Aditya Gaikar',
  provider: 'Dr. Mehra — Sports Medicine',
  planName: 'Lower-Body Rehab · Week 3',
  startDate: 'May 19, 2026',
}

const WEEKLY_PLAN: DayPlan[] = [
  {
    day: 'Mon',
    date: 'May 19',
    exercises: [
      { id: 'mon-1', name: 'Squats',           slug: 'squats',           targetReps: 15, completed: false },
      { id: 'mon-2', name: 'Lunges',           slug: 'lunges',           targetReps: 12, completed: false },
      { id: 'mon-3', name: 'Warrior Pose',     slug: 'warrior-pose',     targetReps: 3,  completed: false },
    ],
  },
  {
    day: 'Tue',
    date: 'May 20',
    exercises: [
      { id: 'tue-1', name: 'Push-ups',         slug: 'push-ups',         targetReps: 20, completed: false },
      { id: 'tue-2', name: 'Mountain Climbers', slug: 'mountain-climbers', targetReps: 30, completed: false },
    ],
  },
  {
    day: 'Wed',
    date: 'May 21',
    exercises: [
      { id: 'wed-1', name: 'Yoga Flow',        slug: 'yoga-flow',        targetReps: 1,  completed: false },
      { id: 'wed-2', name: 'Hand Folding',     slug: 'hand-folding',     targetReps: 20, completed: false },
    ],
  },
  {
    day: 'Thu',
    date: 'May 22',
    exercises: [
      { id: 'thu-1', name: 'Squats',           slug: 'squats',           targetReps: 20, completed: false },
      { id: 'thu-2', name: 'Lunges',           slug: 'lunges',           targetReps: 15, completed: false },
      { id: 'thu-3', name: 'Jumping Jacks',    slug: 'jumping-jacks',    targetReps: 40, completed: false },
    ],
  },
  {
    day: 'Fri',
    date: 'May 23',
    exercises: [
      { id: 'fri-1', name: 'Burpees',          slug: 'burpees',          targetReps: 10, completed: false },
      { id: 'fri-2', name: 'Push-ups',         slug: 'push-ups',         targetReps: 25, completed: false },
      { id: 'fri-3', name: 'Mountain Climbers', slug: 'mountain-climbers', targetReps: 30, completed: false },
    ],
  },
  {
    day: 'Sat',
    date: 'May 24',
    exercises: [
      { id: 'sat-1', name: 'Yoga Flow',        slug: 'yoga-flow',        targetReps: 1,  completed: false },
      { id: 'sat-2', name: 'Warrior Pose',     slug: 'warrior-pose',     targetReps: 5,  completed: false },
    ],
  },
  {
    day: 'Sun',
    date: 'May 25',
    exercises: [
      { id: 'sun-1', name: 'Hand Folding',     slug: 'hand-folding',     targetReps: 15, completed: false },
    ],
  },
]

/* ─────────────────────────────────────────────
   Page component
───────────────────────────────────────────── */
export default function CarePlanPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [weekData, setWeekData] = useState<DayPlan[]>(WEEKLY_PLAN)

  const todayPlan = weekData[selectedDay]!

  const toggleExercise = (exerciseId: string) => {
    setWeekData((prev) =>
      prev.map((day, i) =>
        i === selectedDay
          ? {
              ...day,
              exercises: day.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
              ),
            }
          : day
      )
    )
  }

  // Overall week progress
  const weekProgress = useMemo(() => {
    const total = weekData.reduce((acc, d) => acc + d.exercises.length, 0)
    const done = weekData.reduce((acc, d) => acc + d.exercises.filter((e) => e.completed).length, 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  }, [weekData])

  // Day progress
  const dayProgress = useMemo(() => {
    const total = todayPlan.exercises.length
    const done = todayPlan.exercises.filter((e) => e.completed).length
    return total > 0 ? Math.round((done / total) * 100) : 0
  }, [todayPlan])

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Calendar className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Care Plan</h1>
          <p className="text-white/60 mt-1">Your personalized weekly rehab timeline.</p>
        </div>
      </div>

      {/* ── Patient info banner ── */}
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{PATIENT.name}</p>
            <p className="text-xs text-white/40 truncate">{PATIENT.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/50">
          <div>
            <p className="text-white/30 uppercase tracking-wider font-medium">Plan</p>
            <p className="text-white/70 mt-0.5 font-medium">{PATIENT.planName}</p>
          </div>
          <div>
            <p className="text-white/30 uppercase tracking-wider font-medium">Started</p>
            <p className="text-white/70 mt-0.5 font-medium">{PATIENT.startDate}</p>
          </div>
        </div>
      </GlassCard>

      {/* ── Week progress bar ── */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Weekly Progress</span>
          </div>
          <span className="text-xs font-bold text-cyan-400">{weekProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${weekProgress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </GlassCard>

      {/* ── Day selector (horizontal scroll) ── */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {weekData.map((day, i) => {
          const isActive = i === selectedDay
          const dayDone = day.exercises.filter((e) => e.completed).length
          const dayTotal = day.exercises.length
          const allDone = dayDone === dayTotal

          return (
            <motion.button
              key={day.day}
              onClick={() => setSelectedDay(i)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`relative shrink-0 w-[88px] py-4 px-3 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_24px_rgba(6,182,212,0.15)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-cyan-400' : 'text-white/40'}`}>
                {day.day}
              </p>
              <p className={`text-sm font-semibold mt-1 ${isActive ? 'text-white' : 'text-white/60'}`}>
                {day.date}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className={`text-[10px] font-bold ${allDone ? 'text-emerald-400' : isActive ? 'text-cyan-400/70' : 'text-white/30'}`}>
                  {dayDone}/{dayTotal}
                </span>
              </div>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="activeDayIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Day exercises ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <GlassCard className="p-6">
            {/* Day header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {todayPlan.day}, {todayPlan.date}
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {todayPlan.exercises.length} exercise{todayPlan.exercises.length !== 1 ? 's' : ''} assigned
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${dayProgress}%` }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                  />
                </div>
                <span className="text-xs font-bold text-white/50">{dayProgress}%</span>
              </div>
            </div>

            {/* Exercise rows */}
            <div className="space-y-3">
              {todayPlan.exercises.map((exercise, idx) => (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                    exercise.completed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleExercise(exercise.id)}
                    className="shrink-0 transition-transform active:scale-90"
                    aria-label={exercise.completed ? `Mark ${exercise.name} incomplete` : `Mark ${exercise.name} complete`}
                  >
                    {exercise.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-white/20 hover:text-white/40 transition-colors" />
                    )}
                  </button>

                  {/* Exercise info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${exercise.completed ? 'text-white/40 line-through' : 'text-white'}`}>
                      {exercise.name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {exercise.targetReps} {exercise.targetReps === 1 ? 'session' : 'reps'} target
                    </p>
                  </div>

                  {/* Start button */}
                  <Link href={`/exercises/${exercise.slug}`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                        exercise.completed
                          ? 'border-white/8 bg-white/[0.02] text-white/30 hover:text-white/50'
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      {exercise.completed ? 'Redo' : 'Start'}
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Completion message */}
            <AnimatePresence>
              {dayProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 pt-5 border-t border-white/8 text-center"
                >
                  <p className="text-sm font-semibold text-emerald-400">🎉 All exercises completed for {todayPlan.day}!</p>
                  <p className="text-xs text-white/30 mt-1">Great work — keep up the momentum.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      </AnimatePresence>

    </div>
  )
}
