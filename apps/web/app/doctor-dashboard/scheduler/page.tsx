'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar, Bell, Plus, Clock, User, AlertCircle,
  Video, CheckCircle2, Loader2, RefreshCw, Zap,
  AlertTriangle, ChevronRight, Activity,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface TriagePatient {
  _id: string
  name: string
  email: string
  condition: string
  complianceScore: number | null
  recentFormScores: number[]
  nextAppointment: string | null
}

interface Appointment {
  id: number | string
  patientId?: string
  patientName: string
  date: string
  time: string
  type: string
  isLive?: boolean   // sourced from DB
}

interface CloudAlert {
  id: string
  patientId: string
  patientName: string
  condition: string
  complianceScore: number
  urgency: 'critical' | 'warning'
  message: string
  generatedAt: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function formatApptDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  d.setHours(0,0,0,0)
  if (d.getTime() === today.getTime())    return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const now  = new Date(); now.setHours(0,0,0,0)
  const appt = new Date(dateStr); appt.setHours(0,0,0,0)
  return Math.round((appt.getTime() - now.getTime()) / 86400000)
}

/** Derive cloud alerts from live triage data */
function deriveAlerts(patients: TriagePatient[]): CloudAlert[] {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return patients
    .filter((p) => p.complianceScore !== null && p.complianceScore < 60)
    .map((p) => {
      const score = p.complianceScore as number
      const urgency: CloudAlert['urgency'] = score < 40 ? 'critical' : 'warning'
      return {
        id:            `alert-${p._id}`,
        patientId:     p._id,
        patientName:   p.name,
        condition:     p.condition,
        complianceScore: score,
        urgency,
        message:
          urgency === 'critical'
            ? `CRITICAL: ${p.name}'s compliance has collapsed to ${score}%. Immediate intervention required.`
            : `WARNING: ${p.name}'s compliance dropped to ${score}% — below the 60% threshold. Intervention required.`,
        generatedAt: `Today, ${now}`,
      }
    })
    .sort((a, b) => a.complianceScore - b.complianceScore) // most critical first
}

/* ─────────────────────────────────────────────
   Alert card component
───────────────────────────────────────────── */
function AlertCard({ alert, onDismiss }: { alert: CloudAlert; onDismiss: (id: string) => void }) {
  const isCritical = alert.urgency === 'critical'
  return (
    <div className={`rounded-2xl border bg-white/[0.02] backdrop-blur-md p-4 border-l-4 transition-all group ${
      isCritical
        ? 'border-white/10 border-l-red-500'
        : 'border-white/10 border-l-amber-500'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5">
          <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
          <div>
            <p className="text-white text-sm font-semibold leading-snug">{alert.message}</p>
            <p className="text-white/30 text-xs mt-1">{alert.generatedAt}</p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="shrink-0 p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      </div>

      {/* Score pill + condition */}
      <div className="flex items-center gap-2 mt-3 pl-6">
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
          isCritical
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          {alert.complianceScore}% compliance
        </span>
        <span className="text-[10px] text-white/30">{alert.condition}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Appointment card component
───────────────────────────────────────────── */
function AppointmentCard({
  appt,
  onReschedule,
  onCancel,
}: {
  appt: Appointment
  onReschedule: (id: string | number) => void
  onCancel: (id: string | number) => void
}) {
  const days = daysUntil(appt.date)
  const isUrgent = days <= 1
  const isPast   = days < 0

  return (
    <GlassCard className={`p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/20 transition-all ${
      isPast ? 'opacity-50' : ''
    }`}>
      <div className="flex items-center gap-4 w-full min-w-0">
        {/* Type icon */}
        <div className={`p-3 rounded-xl border shrink-0 hidden sm:flex ${
          appt.type.includes('Video')
            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            : appt.type.includes('Follow')
              ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {appt.type.includes('Video') ? <Video className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white">{appt.patientName}</p>
            {appt.isLive && (
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                Live
              </span>
            )}
            {isUrgent && !isPast && (
              <span className="text-[10px] font-bold text-amber-400 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatApptDate(appt.date)}
              {!isPast && days >= 0 && (
                <span className="text-white/20 ml-1">
                  ({days === 0 ? 'today' : `in ${days}d`})
                </span>
              )}
            </span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {appt.time}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{appt.type}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 self-end sm:self-auto w-full sm:w-auto shrink-0">
        <button
          onClick={() => onReschedule(appt.id)}
          className="flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        >
          Reschedule
        </button>
        <button
          onClick={() => onCancel(appt.id)}
          className="flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 hover:bg-red-500/15 transition-colors"
        >
          Cancel
        </button>
      </div>
    </GlassCard>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function SchedulerPage() {
  const [patients, setPatients]         = useState<TriagePatient[]>([])
  const [loading, setLoading]           = useState(true)
  const [lastRefresh, setLastRefresh]   = useState<Date>(new Date())
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [showModal, setShowModal]       = useState(false)
  const [rescheduling, setRescheduling] = useState<string | number | null>(null)
  const [newAppt, setNewAppt]           = useState({ patientName: '', date: '', time: '', type: 'Video Consult' })
  const [savedAppts, setSavedAppts]     = useState<Appointment[]>([])

  const fetchAppointments = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSavedAppts(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  /* ── Fetch live triage data ── */
  const fetchTriage = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/dashboard/doctor/triage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: TriagePatient[] = await res.json()
        setPatients(data)
        setLastRefresh(new Date())
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchTriage()
    fetchAppointments()
  }, [fetchAppointments])

  /* ── Derive appointments from live patients (those with nextAppointment set) ── */
  const liveAppts: Appointment[] = useMemo(() =>
    patients
      .filter((p) => p.nextAppointment)
      .map((p) => ({
        id:          `live-${p._id}`,
        patientId:   p._id,
        patientName: p.name,
        date:        new Date(p.nextAppointment!).toISOString().slice(0, 10),
        time:        new Date(p.nextAppointment!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type:        'Follow-up',
        isLive:      true,
      })),
    [patients]
  )

  /* ── Merge live + manual, sort chronologically ── */
  const allAppointments: Appointment[] = useMemo(() =>
    [...liveAppts, ...savedAppts]
      .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime()),
    [liveAppts, savedAppts]
  )

  /* ── Derive cloud alerts from compliance scores ── */
  const allAlerts = useMemo(() => deriveAlerts(patients), [patients])
  const visibleAlerts = useMemo(
    () => allAlerts.filter((a) => !dismissedAlerts.has(a.id)),
    [allAlerts, dismissedAlerts]
  )

  /* ── Handlers ── */
  const handleDismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]))
  }

  const handleCancel = async (id: string | number) => {
    const appt = allAppointments.find((item) => item.id === id)
    if (appt?.isLive && appt.patientId) {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await fetch(`${API}/users/doctor/patients/${encodeURIComponent(appt.patientId)}/next-appointment`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nextAppointment: null }),
        })
        if (res.ok) {
          await fetchTriage()
        }
      } catch (err) {
        console.error(err)
      }
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch(`${API}/appointments/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await fetchAppointments()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleReschedule = (id: string | number) => {
    setRescheduling(id)
    setShowModal(true)
    const appt = allAppointments.find((a) => a.id === id)
    if (appt) setNewAppt({ patientName: appt.patientName, date: appt.date, time: appt.time, type: appt.type })
  }

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAppt.patientName || !newAppt.date || !newAppt.time) return

    const token = localStorage.getItem('token')
    if (!token) return

    const existingAppt = rescheduling ? allAppointments.find((item) => item.id === rescheduling) : null
    const nextAppointment = new Date(`${newAppt.date}T${newAppt.time}:00`).toISOString()

    try {
      if (existingAppt?.isLive && existingAppt.patientId) {
        const response = await fetch(`${API}/users/doctor/patients/${encodeURIComponent(existingAppt.patientId)}/next-appointment`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nextAppointment }),
        })

        if (!response.ok) {
          throw new Error('Failed to save appointment')
        }

        await fetchTriage()
      } else {
        const response = await fetch(
          rescheduling ? `${API}/appointments/${encodeURIComponent(String(rescheduling))}` : `${API}/appointments`,
          {
            method: rescheduling ? 'PATCH' : 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...newAppt,
            }),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to save appointment')
        }

        await fetchAppointments()
      }
      setShowModal(false)
      setRescheduling(null)
      setNewAppt({ patientName: '', date: '', time: '', type: 'Video Consult' })
    } catch (err) {
      console.error(err)
    }
  }

  /* ── Upcoming vs past split ── */
  const upcomingAppts = allAppointments.filter((a) => daysUntil(a.date) >= 0)
  const pastAppts     = allAppointments.filter((a) => daysUntil(a.date) < 0)

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Scheduler & Alerts</h1>
          <p className="text-white/60 mt-1">
            Live appointments from MongoDB · Automated compliance alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={fetchTriage}
            disabled={loading}
            title="Refresh live data"
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-white/40 hover:text-white transition-colors disabled:opacity-40"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
          </button>
          {/* New appointment */}
          <button
            onClick={() => { setRescheduling(null); setNewAppt({ patientName: '', date: '', time: '', type: 'Video Consult' }); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="h-4 w-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* ── Live data status bar ── */}
      {!loading && (
        <div className="flex items-center gap-2 text-xs text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {patients.length} patient{patients.length !== 1 ? 's' : ''} loaded from MongoDB
            · Last synced {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════════════════════════════
            LEFT: Scheduler (2/3 width)
        ════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Section label */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white/20 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Upcoming Appointments
              {upcomingAppts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-bold">
                  {upcomingAppts.length}
                </span>
              )}
            </h2>
          </div>

          {/* Loading skeletons */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : upcomingAppts.length === 0 ? (
            <GlassCard className="py-14 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No upcoming appointments.</p>
              <p className="text-white/15 text-xs mt-1">
                Patients need a <code className="text-cyan-400/50">nextAppointment</code> date in MongoDB,
                or add one manually above.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}

          {/* Past appointments (collapsed) */}
          {pastAppts.length > 0 && (
            <div className="space-y-3 opacity-50">
              <h3 className="text-xs font-semibold text-white/20 uppercase tracking-widest">
                Past ({pastAppts.length})
              </h3>
              {pastAppts.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            RIGHT: Cloud Alerts (1/3 width)
        ════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Section label */}
          <h2 className="text-xs font-semibold text-white/20 uppercase tracking-widest flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            Automated Cloud Alerts
            {visibleAlerts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold animate-pulse">
                {visibleAlerts.length}
              </span>
            )}
          </h2>

          {/* How alerts work — shown when no alerts */}
          {!loading && visibleAlerts.length === 0 && (
            <GlassCard className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">All patients within threshold</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">
                    No compliance scores below 60%. Alerts auto-generate when a patient's live score drops below the threshold.
                  </p>
                </div>
              </div>
              {/* Engine status */}
              <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] text-white/30">Alert engine active · Monitoring {patients.length} patient{patients.length !== 1 ? 's' : ''}</span>
              </div>
            </GlassCard>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          )}

          {/* Live alerts derived from DB */}
          {!loading && visibleAlerts.length > 0 && (
            <div className="space-y-3">
              {/* Engine badge */}
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] text-white/30">
                  Auto-generated from live MongoDB compliance data
                </span>
              </div>

              {visibleAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={handleDismissAlert}
                />
              ))}

              {/* Dismissed count */}
              {dismissedAlerts.size > 0 && (
                <button
                  onClick={() => setDismissedAlerts(new Set())}
                  className="w-full text-xs text-white/20 hover:text-white/50 transition-colors py-1"
                >
                  {dismissedAlerts.size} dismissed · click to restore
                </button>
              )}
            </div>
          )}

          {/* Static informational alerts (non-compliance) */}
          {!loading && (
            <div className="space-y-3 mt-2">
              <p className="text-[10px] text-white/15 uppercase tracking-widest px-1">System</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4 border-l-4 border-l-cyan-500">
                <div className="flex items-start gap-2.5">
                  <Activity className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                  <div>
                    <p className="text-white text-sm font-medium leading-snug">
                      Compliance engine synced with {patients.length} patient record{patients.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-white/30 text-xs mt-1">
                      {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New / Reschedule Appointment Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] backdrop-blur-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold tracking-tight text-white mb-5">
              {rescheduling ? 'Reschedule Appointment' : 'New Appointment'}
            </h2>
            <form onSubmit={handleSchedule} className="space-y-4">

              {/* Patient name — prefilled from live roster if available */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Patient Name</label>
                {patients.length > 0 && !rescheduling ? (
                  <select
                    value={newAppt.patientName}
                    onChange={(e) => setNewAppt({ ...newAppt, patientName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                  >
                    <option value="" className="bg-neutral-900">Select a patient…</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p.name} className="bg-neutral-900">{p.name}</option>
                    ))}
                    <option value="__custom__" className="bg-neutral-900">Other (type below)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newAppt.patientName}
                    onChange={(e) => setNewAppt({ ...newAppt, patientName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
                    placeholder="e.g. John Doe"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={newAppt.date}
                    onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Time</label>
                  <input
                    type="time"
                    required
                    value={newAppt.time}
                    onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Appointment Type</label>
                <select
                  value={newAppt.type}
                  onChange={(e) => setNewAppt({ ...newAppt, type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                >
                  <option className="bg-neutral-900">Video Consult</option>
                  <option className="bg-neutral-900">In-Person Clinic</option>
                  <option className="bg-neutral-900">Follow-up</option>
                  <option className="bg-neutral-900">Therapy Evaluation</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setRescheduling(null) }}
                  className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  {rescheduling ? 'Update' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
