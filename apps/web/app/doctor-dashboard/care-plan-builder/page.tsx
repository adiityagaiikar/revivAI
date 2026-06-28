'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, ChevronDown, Plus, X,
  Dumbbell, Loader2, CheckCircle2, Zap,
  Sparkles, Brain, AlertTriangle, Trash2,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { ALL_EXERCISES, ALL_COGNITIVE_GAMES, type ExerciseItem } from '@/lib/activity-catalog'
import {
  assignCareTask, generateAndSaveCarePlan, getCarePlan, removeTask,
  type CareTask, type TaskType,
} from '@/app/actions/carePlanActions'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types & constants
───────────────────────────────────────────── */
interface Patient { _id: string; name: string; condition?: string }
type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

const DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL: Record<DayKey, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}
const DAY_SHORT: Record<string, DayKey> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

const CATALOG_ORDER = ['squats', 'push-ups', 'lunges', 'burpees', 'jumping-jacks', 'mountain-climbers', 'warrior-pose', 'yoga-flow', 'hand-folding']
const PHYSICAL_CATALOG = CATALOG_ORDER
  .map((s) => ALL_EXERCISES.find((e) => e.slug === s))
  .filter(Boolean) as ExerciseItem[]

const CATEGORY_COLORS: Record<string, string> = {
  Strength: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Cardio: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Core: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Flexibility: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}
function pillColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-white/8 text-white/50 border-white/15'
}

/* ─────────────────────────────────────────────
   Assign Modal
───────────────────────────────────────────── */
function AssignModal({
  name, taskType, onConfirm, onClose, saving,
}: {
  name: string
  taskType: TaskType
  onConfirm: (day: DayKey, value: number) => void
  onClose: () => void
  saving: boolean
}) {
  const [day, setDay] = useState<DayKey>('Mon')
  const [value, setValue] = useState(12)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <GlassCard className="w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">Assign Task</h3>
            <p className="text-xs text-white/40 mt-0.5">Adding to patient's weekly plan</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8 mb-5">
          <div className={`p-2.5 rounded-xl border shrink-0 ${taskType === 'PHYSICAL' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
            {taskType === 'PHYSICAL'
              ? <Dumbbell className="h-4 w-4 text-cyan-400" />
              : <Brain className="h-4 w-4 text-violet-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-white/40">{taskType === 'PHYSICAL' ? 'Physical Exercise' : 'Cognitive Game'}</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onConfirm(day, value) }} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Select Day</label>
            <div className="relative">
              <select value={day} onChange={(e) => setDay(e.target.value as DayKey)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors pr-10">
                {DAYS.map((d) => <option key={d} value={d} className="bg-neutral-900">{DAY_FULL[d]}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
              {taskType === 'PHYSICAL' ? 'Target Reps' : 'Target Level'}
            </label>
            <input type="number" min={1} max={200} value={value}
              onChange={(e) => setValue(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2">
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
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [carePlan, setCarePlan] = useState<CareTask[]>([])
  const [planLoading, setPlanLoading] = useState(false)
  // Manual assign modal
  const [modalItem, setModalItem] = useState<{ name: string; taskType: TaskType } | null>(null)
  const [saving, setSaving] = useState(false)
  // AI prompt
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(false)
  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const router = useRouter()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

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

  /* ── Load care plan when patient changes ── */
  useEffect(() => {
    if (!selectedPatientId) return
    setPlanLoading(true)
    getCarePlan(selectedPatientId)
      .then(setCarePlan)
      .finally(() => setPlanLoading(false))
  }, [selectedPatientId])

  /* ── Listen for careplan:updated events ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.patientId === selectedPatientId) {
        getCarePlan(selectedPatientId).then(setCarePlan)
      }
    }
    window.addEventListener('careplan:updated', handler)
    return () => window.removeEventListener('careplan:updated', handler)
  }, [selectedPatientId])

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) ?? null

  /* ── Manual assign confirm ── */
  const handleManualConfirm = useCallback(async (day: DayKey, value: number) => {
    if (!modalItem || !selectedPatientId) return
    setSaving(true)
    try {
      await assignCareTask(
        selectedPatientId,
        modalItem.taskType,
        modalItem.name,
        value,
        DAY_FULL[day],
      )
      setModalItem(null)
      showToast(`${modalItem.name} assigned to ${DAY_FULL[day]}`)
    } catch (err: any) {
      showToast(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [modalItem, selectedPatientId])

  /* ── Remove task ── */
  const handleRemove = useCallback(async (taskId: string) => {
    if (!selectedPatientId || !taskId) return
    try {
      await removeTask(selectedPatientId, taskId)
      showToast('Task removed')
    } catch (err: any) {
      showToast(`Error: ${err.message}`)
    }
  }, [selectedPatientId])

  /* ── AI generate ── */
  const handleAiGenerate = useCallback(async () => {
    if (!selectedPatientId || !aiPrompt.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await generateAndSaveCarePlan(
        selectedPatientId,
        aiPrompt.trim(),
        replaceExisting,
      )
      setAiPrompt('')
      showToast(`✓ ${result.tasksAdded} tasks generated and saved`)
    } catch (err: any) {
      setAiError(err.message ?? 'AI generation failed.')
    } finally {
      setAiLoading(false)
    }
  }, [selectedPatientId, aiPrompt, replaceExisting])

  /* ── Group plan by day ── */
  const tasksByDay = (day: DayKey): CareTask[] =>
    carePlan.filter((t) => {
      const short = DAY_SHORT[t.assignedDay] ?? t.assignedDay.slice(0, 3)
      return short === day
    })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <ClipboardList className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Care Plan Builder</h1>
          <p className="text-white/60 mt-1">Manually assign tasks or use AI to generate a full 7-day plan.</p>
        </div>
      </div>

      {/* ── Patient selector ── */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Select Patient</label>
            {patientsLoading ? <Skeleton className="h-10 w-64" /> : (
              <div className="relative w-full sm:w-80">
                <select
                  value={selectedPatientId}
                  onChange={(e) => { setSelectedPatientId(e.target.value); setCarePlan([]) }}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors pr-10"
                >
                  {patients.length === 0 && <option value="" className="bg-neutral-900">No patients found</option>}
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

      {selectedPatient && (
        <>
          {/* ── AI Prescription Assistant ── */}
          <div className={`rounded-2xl border backdrop-blur-md p-6 transition-all duration-500 ${aiLoading
              ? 'border-cyan-500/50 bg-white/[0.03] animate-pulse shadow-[0_0_40px_rgba(6,182,212,0.12),0_0_80px_rgba(139,92,246,0.08)]'
              : 'border-violet-500/25 bg-white/[0.02]'
            }`}
            style={aiLoading ? {
              backgroundImage: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(139,92,246,0.04) 100%)',
            } : undefined}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border transition-all duration-300 ${aiLoading
                    ? 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-violet-500/10 border-violet-500/20'
                  }`}>
                  <Sparkles className={`h-5 w-5 transition-colors duration-300 ${aiLoading ? 'text-cyan-400' : 'text-violet-400'}`} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    AI Prescription Assistant
                  </h2>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Gemini 2.5 Flash · Natural language → structured 7-day care plan
                  </p>
                </div>
              </div>

              {/* Live badge when generating */}
              {aiLoading && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Processing
                </span>
              )}
            </div>

            {/* Textarea */}
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiLoading}
              placeholder={`e.g. Generate a 5-day low-impact physical routine and 2 days of cognitive baseline testing for ${selectedPatient.name}. Start with 10 squats on Monday, increase to 15 by Wednesday. Add Corsi Block on Tuesday and Thursday at level 3.`}
              rows={4}
              className={`w-full bg-white/[0.02] border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none resize-none transition-all duration-300 mb-5 ${aiLoading
                  ? 'border-cyan-500/30 bg-cyan-500/5 cursor-not-allowed opacity-70'
                  : 'border-white/10 focus:border-violet-500/50 focus:bg-white/[0.03]'
                }`}
            />

            {/* Footer row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    disabled={aiLoading}
                    className="accent-violet-400"
                  />
                  <span className="text-xs text-white/45">Replace existing plan</span>
                </label>

                {aiError && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 disabled:cursor-not-allowed ${aiLoading
                    ? 'bg-gradient-to-r from-cyan-500/80 to-violet-500/80 text-white opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4),0_0_40px_rgba(139,92,246,0.2)]'
                    : 'bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-40'
                  }`}
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Compiling clinical data…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate &amp; Assign Plan
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── 7-day calendar grid ── */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Weekly Plan</h2>
              <p className="text-xs text-white/30">
                {planLoading ? 'Loading…' : `${carePlan.length} task${carePlan.length !== 1 ? 's' : ''} assigned`}
              </p>
            </div>

            {planLoading ? (
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((d) => <Skeleton key={d} className="h-24" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const tasks = tasksByDay(day)
                  const isWeekend = day === 'Sat' || day === 'Sun'
                  return (
                    <div key={day} className={`rounded-xl border p-2.5 min-h-[110px] flex flex-col gap-1.5 ${isWeekend ? 'border-white/5 bg-white/[0.01]' : 'border-white/8 bg-white/[0.02]'
                      }`}>
                      <p className={`text-[11px] font-bold uppercase tracking-widest text-center mb-1 ${isWeekend ? 'text-white/20' : 'text-white/50'
                        }`}>{day}</p>

                      {tasks.map((t) => (
                        <div key={t._id ?? t.taskName}
                          className={`group relative flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold leading-tight ${t.taskType === 'PHYSICAL'
                              ? 'bg-cyan-500/15 border border-cyan-500/25 text-cyan-400'
                              : 'bg-violet-500/15 border border-violet-500/25 text-violet-400'
                            } ${t.isCompleted ? 'opacity-40 line-through' : ''}`}>
                          <span className="truncate">{t.taskName}</span>
                          <span className="shrink-0 opacity-60">·{t.targetValue}</span>
                          {t._id && (
                            <button
                              onClick={() => handleRemove(t._id!)}
                              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Remove"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      ))}

                      {tasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="h-1 w-1 rounded-full bg-white/10" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-[10px] text-white/20 mt-3">
              Cyan = Physical · Violet = Cognitive · Hover a pill and click × to remove
            </p>
          </GlassCard>

          {/* ── Manual catalog ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Physical exercises */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Physical Exercises</h2>
              </div>
              <div className="space-y-2">
                {PHYSICAL_CATALOG.map((ex) => (
                  <GlassCard key={ex.slug} className="p-4 flex items-center gap-4 hover:border-white/20 transition-all group">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
                      <Dumbbell className="h-4 w-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white">{ex.name}</p>
                        {ex.hasAI && <span className="text-[10px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">AI</span>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pillColor(ex.category)}`}>{ex.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalItem({ name: ex.name, taskType: 'PHYSICAL' })}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Cognitive games */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Cognitive Games</h2>
              </div>
              <div className="space-y-2">
                {ALL_COGNITIVE_GAMES.map((g) => (
                  <GlassCard key={g.slug} className="p-4 flex items-center gap-4 hover:border-white/20 transition-all group">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-colors">
                      <Brain className="h-4 w-4 text-white/40 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-0.5">{g.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-400 border-violet-500/25">{g.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalItem({ name: g.name, taskType: 'COGNITIVE' })}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-400 text-xs font-semibold transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!selectedPatient && !patientsLoading && (
        <GlassCard className="py-16 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">Select a patient above to start building their care plan.</p>
        </GlassCard>
      )}

      {/* Assign modal */}
      {modalItem && (
        <AssignModal
          name={modalItem.name}
          taskType={modalItem.taskType}
          onConfirm={handleManualConfirm}
          onClose={() => setModalItem(null)}
          saving={saving}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-white">{toast}</p>
        </div>
      )}
    </div>
  )
}
