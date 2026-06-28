'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Stethoscope, CheckCircle2, AlertTriangle, Loader2,
  Zap, X, ChevronDown, UserCheck, RefreshCw,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import {
  autoAssignDoctor, getTriageDoctors,
  type AutoAssignResult, type TriageDoctor,
} from '@/app/actions/triageActions'
import { COMMON_ISSUES } from '@/lib/constants'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

/* ─────────────────────────────────────────────
   Issue pill
───────────────────────────────────────────── */
function IssuePill({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        selected
          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
          : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5'
      }`}
    >
      {selected && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {label}
    </button>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function CarePlanPage() {
  const [patientId, setPatientId]         = useState<string | null>(null)
  const [doctors, setDoctors]             = useState<TriageDoctor[]>([])
  const [assignedDoctor, setAssignedDoctor] = useState<string | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())
  const [customIssue, setCustomIssue]     = useState('')
  const [loading, setLoading]             = useState(false)
  const [result, setResult]               = useState<AutoAssignResult | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [pageLoading, setPageLoading]     = useState(true)

  /* ── Load patient ID + current assignment ── */
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setPageLoading(false); return }
      try {
        const [meRes, assocRes, triageRes] = await Promise.all([
          fetch(`${API}/users/me`,           { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/users/associations`, { headers: { Authorization: `Bearer ${token}` } }),
          getTriageDoctors(),
        ])
        if (meRes.ok) {
          const me = await meRes.json()
          setPatientId(me.id ?? me._id)
        }
        if (assocRes.ok) {
          const assoc = await assocRes.json()
          const docs: any[] = assoc.doctors ?? []
          if (docs.length > 0) setAssignedDoctor(docs[0].name)
        }
        setDoctors(triageRes)
      } catch (err) { console.error(err) }
      finally { setPageLoading(false) }
    }
    run()
  }, [])

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev)
      next.has(issue) ? next.delete(issue) : next.add(issue)
      return next
    })
  }

  const addCustomIssue = () => {
    const trimmed = customIssue.trim()
    if (!trimmed) return
    setSelectedIssues((prev) => new Set([...prev, trimmed]))
    setCustomIssue('')
  }

  const handleAssign = useCallback(async () => {
    if (!patientId || selectedIssues.size === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await autoAssignDoctor(patientId, Array.from(selectedIssues))
      setResult(res)
      setAssignedDoctor(res.doctorName)
    } catch (err: any) {
      setError(err.message ?? 'Auto-triage failed.')
    } finally {
      setLoading(false)
    }
  }, [patientId, selectedIssues])

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Stethoscope className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Care Plan</h1>
          <p className="text-white/60 mt-1">
            Report your health issues and let the AI triage engine match you to the right doctor.
          </p>
        </div>
      </div>

      {/* ── Current assignment banner ── */}
      {assignedDoctor && (
        <GlassCard className="p-4 flex items-center gap-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Currently assigned to {assignedDoctor}</p>
            <p className="text-xs text-white/40 mt-0.5">
              Re-run triage below to update your assignment based on new issues.
            </p>
          </div>
        </GlassCard>
      )}

      {/* ── Issue selector ── */}
      <GlassCard glow className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Select Your Health Issues</h2>
          <p className="text-xs text-white/35">
            Choose all that apply. The triage engine will match you to the doctor with the most relevant specialties.
          </p>
        </div>

        {pageLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-32" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {COMMON_ISSUES.map((issue) => (
              <IssuePill
                key={issue}
                label={issue}
                selected={selectedIssues.has(issue)}
                onClick={() => toggleIssue(issue)}
              />
            ))}
          </div>
        )}

        {/* Custom issue input */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Add custom issue</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customIssue}
              onChange={(e) => setCustomIssue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomIssue()}
              placeholder="e.g. Frozen Shoulder, Plantar Fasciitis…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/40 transition-colors"
            />
            <button
              type="button"
              onClick={addCustomIssue}
              disabled={!customIssue.trim()}
              className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Selected issues summary */}
        {selectedIssues.size > 0 && (
          <div className="pt-4 border-t border-white/8">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">
              Selected ({selectedIssues.size})
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedIssues).map((issue) => (
                <span
                  key={issue}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-xs text-cyan-300 font-medium"
                >
                  {issue}
                  <button
                    onClick={() => toggleIssue(issue)}
                    className="text-cyan-400/60 hover:text-cyan-300 transition-colors"
                    aria-label={`Remove ${issue}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">{result.message}</p>
              {result.matchScore > 0 && (
                <p className="text-xs text-white/40 mt-1">
                  {result.matchScore} specialty match{result.matchScore !== 1 ? 'es' : ''} found
                </p>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleAssign}
          disabled={loading || selectedIssues.size === 0 || !patientId}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)]"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running Triage…</>
            : result
              ? <><RefreshCw className="h-4 w-4" /> Re-run Triage</>
              : <><Zap className="h-4 w-4" /> Auto-Assign Doctor</>}
        </button>
      </GlassCard>

      {/* ── Available doctors ── */}
      {doctors.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-base font-semibold text-white mb-4">Available Doctors & Specialties</h2>
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div key={doc._id} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/8">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {doc.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{doc.name}</p>
                  <p className="text-xs text-white/35 mb-2">{doc.email}</p>
                  {doc.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {doc.specialties.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/20 italic">No specialties listed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
