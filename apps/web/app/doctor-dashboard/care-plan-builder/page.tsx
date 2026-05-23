'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, ChevronDown, Plus, X,
  Dumbbell, Loader2, CheckCircle2, Zap,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { ALL_EXERCISES, type ExerciseItem } from '@/lib/activity-catalog'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Patient {
  _id: string
  name: string
  condition?: string
}

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

interface Assignment {
  id: string
  exercise: ExerciseItem
  reps: number
  day: DayKey
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAY_FULL: Record<DayKey, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

// Highlight AI exercises prominently — squats, push-ups, lunges first
const CATALOG_ORDER = ['squats', 'push-ups', 'lunges', 'burpees', 'jumping-jacks', 'mountain-climbers', 'warrior-pose', 'yoga-flow', 'hand-folding']
const CATALOG = CATALOG_ORDER
  .map((slug) => ALL_EXERCISES.find((e) => e.slug === slug))
  .filter(Boolean) as ExerciseItem[]

const CATEGORY_COLORS: Record<string, string> = {
  Strength:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Cardio:      'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Core:        'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Flexibility: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

/* ─────────────────────────────────────────────
   Server Action placeholder
   (In a real app this would be 'use server' in
    a separate file calling the backend API)
───────────────────────────────────────────── */
async function assignExerciseToPatient(
  patientId: string,
  exerciseSlug: string,
  day: DayKey,
  reps: number,
): Promise<{ ok: boolean }> {
  // Placeholder — wire to PATCH /api/users/doctor/patients/:id/plan
  // or a dedicated care-plan endpoint when the backend route is ready.
  console.log('[Server Action] assignExerciseToPatient', { patientId, exerciseSlug, day, reps })
  await new Promise((r) => setTimeout(r, 600)) // simulate network
  return { ok: true }
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function pillColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-white/8 text-white/50 border-white/15'
}

/* ─────────────────────────────────────────────
   Assignment Modal
───────────────────────────────────────────── */
function AssignModal({
  exercise,
  onConfirm,
  onClose,
  saving,
}: {
  exercise: ExerciseItem
  onConfirm: (day: DayKey, reps: number) => void
  onClose: () => void
  saving: boolean
}) {
  const [day, setDay]   = useState<DayKey>('Mon')
  const [reps, setReps] = useState(12)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(day, reps)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <GlassCard className="w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">Assign Exercise</h3>
            <p className="text-xs text-white/40 mt-0.5">Adding to patient's weekly plan</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Exercise preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
            <Dumbbell className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{exercise.name}</p>
            <p className="text-xs text-white/40">{exercise.category} · {exercise.difficulty}</p>
          </div>
          {exercise.hasAI && (
            <span className="ml-auto text-[10px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
              AI
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day selector */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
              Select Day
            </label>
            <div className="relative">
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayKey)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors pr-10"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d} className="bg-neutral-900">{DAY_FULL[d]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Reps input */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
              Target Reps
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={reps}
              onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Assignment</>}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function CarePlanBuilderPage() {
  const [patients, setPatients]           = useState<Patient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [assignments, setAssignments]     = useState<Assignment[]>([])
  const [modalExercise, setModalExercise] = useState<ExerciseItem | null>(null)
  const [saving, setSaving]               = useState(false)
  const [savedFlash, setSavedFlash]       = useState<string | null>(null)
  const router = useRouter()

  /* ── Fetch patients ── */
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/doctor/triage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data: Patient[] = await res.json()
          setPatients(data)
          if (data.length > 0) setSelectedPatientId(data[0]._id)
        }
      } catch (err) { console.error(err) }
      finally { setPatientsLoading(false) }
    }
    run()
  }, [router])

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) ?? null

  /* ── Handle assignment confirm ── */
  const handleConfirm = useCallback(async (day: DayKey, reps: number) => {
    if (!modalExercise || !selectedPatientId) return
    setSaving(true)
    try {
      const result = await assignExerciseToPatient(selectedPatientId, modalExercise.slug, day, reps)
      if (result.ok) {
        // Optimistic UI update
        const newAssignment: Assignment = {
          id:       `${selectedPatientId}-${modalExercise.slug}-${day}-${Date.now()}`,
          exercise: modalExercise,
          reps,
          day,
        }
        setAssignments((prev) => [...prev, newAssignment])
        setModalExercise(null)
        // Flash success
        setSavedFlash(`${modalExercise.name} assigned to ${DAY_FULL[day]}`)
        setTimeout(() => setSavedFlash(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }, [modalExercise, selectedPatientId])

  /* ── Remove assignment ── */
  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id))
  }

  /* ── Assignments per day ── */
  const assignmentsByDay = (day: DayKey) =>
    assignments.filter((a) => a.day === day && (!selectedPatientId || true))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <ClipboardList className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Care Plan Builder</h1>
          <p className="text-white/60 mt-1">Assign exercises to a patient's weekly timeline and save to MongoDB.</p>
        </div>
      </div>

      {/* ── Patient selector ── */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
              Select Patient
            </label>
            {patientsLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <div className="relative w-full sm:w-80">
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value)
                    setAssignments([]) // clear plan when switching patient
                  }}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors pr-10"
                >
                  {patients.length === 0 && (
                    <option value="" className="bg-neutral-900">No patients found</option>
                  )}
                  {patients.map((p) => (
                    <option key={p._id} value={p._id} className="bg-neutral-900">
                      {p.name}{p.condition ? ` — ${p.condition}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan-500/8 border border-cyan-500/20">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{selectedPatient.name}</p>
                <p className="text-xs text-white/40">{selectedPatient.condition ?? 'Patient'}</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── 7-day calendar grid ── */}
      {selectedPatient && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Weekly Plan</h2>
            <p className="text-xs text-white/30">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} this week
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => {
              const dayAssignments = assignmentsByDay(day)
              const isWeekend = day === 'Sat' || day === 'Sun'
              return (
                <div
                  key={day}
                  className={`rounded-xl border p-2.5 min-h-[100px] flex flex-col gap-1.5 transition-colors ${
                    isWeekend
                      ? 'border-white/5 bg-white/[0.01]'
                      : 'border-white/8 bg-white/[0.02]'
                  }`}
                >
                  {/* Day label */}
                  <p className={`text-[11px] font-bold uppercase tracking-widest text-center mb-1 ${
                    isWeekend ? 'text-white/20' : 'text-white/50'
                  }`}>
                    {day}
                  </p>

                  {/* Assignment pills */}
                  {dayAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="group relative flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-[10px] font-semibold text-cyan-400 leading-tight"
                    >
                      <span className="truncate">{a.exercise.name}</span>
                      <span className="text-cyan-400/60 shrink-0">·{a.reps}r</span>
                      {/* Remove button */}
                      <button
                        onClick={() => removeAssignment(a.id)}
                        className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}

                  {/* Empty state dot */}
                  {dayAssignments.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="h-1 w-1 rounded-full bg-white/10" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-white/20 mt-3">
            Hover a pill and click × to remove · Assignments save to MongoDB on confirm
          </p>
        </GlassCard>
      )}

      {/* ── Exercise catalog ── */}
      {selectedPatient && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
              AI Exercise Catalog
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATALOG.map((ex) => (
              <GlassCard
                key={ex.slug}
                className="p-4 flex items-start gap-4 hover:border-white/20 transition-all group"
              >
                {/* Icon */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
                  <Dumbbell className="h-4 w-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    {ex.hasAI && (
                      <span className="text-[10px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pillColor(ex.category)}`}>
                      {ex.category}
                    </span>
                    <span className="text-[10px] text-white/30">{ex.difficulty}</span>
                    <span className="text-[10px] text-white/25">· {ex.calories} kcal</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{ex.description}</p>
                </div>

                {/* Assign button */}
                <button
                  type="button"
                  onClick={() => setModalExercise(ex)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state when no patient selected ── */}
      {!selectedPatient && !patientsLoading && (
        <GlassCard className="py-16 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">Select a patient above to start building their care plan.</p>
          <p className="text-white/15 text-xs mt-1">
            Run <code className="text-cyan-400/50">node backend/seedTriagePatients.js</code> to add demo patients.
          </p>
        </GlassCard>
      )}

      {/* ── Assignment modal ── */}
      {modalExercise && (
        <AssignModal
          exercise={modalExercise}
          onConfirm={handleConfirm}
          onClose={() => setModalExercise(null)}
          saving={saving}
        />
      )}

      {/* ── Success toast ── */}
      {savedFlash && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-white">{savedFlash}</p>
        </div>
      )}
    </div>
  )
}
