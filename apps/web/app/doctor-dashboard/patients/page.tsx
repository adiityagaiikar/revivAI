'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Users, Search, Activity, Mail, Calendar,
  ListChecks, FileText, Download, Loader2,
  AlertTriangle, CheckCircle2, Clock, ChevronRight,
  TrendingUp, TrendingDown, Minus, FileDown,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@workspace/ui/components/dialog'
import { GlassCard } from '@/components/GlassCard'
import { ALL_EXERCISES, ALL_COGNITIVE_GAMES } from '@/lib/activity-catalog'
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
  createdAt?: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function complianceColor(score: number | null) {
  if (score === null) return 'text-white/30'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function complianceBg(score: number | null) {
  if (score === null) return 'bg-white/5 border-white/10'
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 60) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

function ComplianceIcon({ score }: { score: number | null }) {
  if (score === null) return <Clock className="h-4 w-4 text-white/25" />
  if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (score >= 60) return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <AlertTriangle className="h-4 w-4 text-red-400" />
}

function TrendIcon({ scores }: { scores: number[] }) {
  if (scores.length < 2) return <Minus className="h-3.5 w-3.5 text-white/25" />
  const delta = scores[scores.length - 1] - scores[0]
  if (delta > 3)  return <TrendingUp   className="h-3.5 w-3.5 text-emerald-400" />
  if (delta < -3) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  return <Minus className="h-3.5 w-3.5 text-white/40" />
}

function complianceLabel(score: number | null): string {
  if (score === null) return 'No data'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Moderate'
  return 'At Risk'
}

/* ─────────────────────────────────────────────
   Custom recharts tooltip
───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md px-3 py-2 text-xs">
      <p className="text-white/40 mb-1">Session {label}</p>
      <p className="text-cyan-400 font-semibold">{payload[0].value}%</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Hidden PDF report template
   Rendered off-screen; html2canvas captures it.
   Strictly paper-style: black text on white bg.
───────────────────────────────────────────── */
function PdfReportTemplate({
  patient,
  reportRef,
}: {
  patient: TriagePatient
  reportRef: React.RefObject<HTMLDivElement | null>
}) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const avg = patient.recentFormScores.length
    ? Math.round(patient.recentFormScores.reduce((a, b) => a + b, 0) / patient.recentFormScores.length)
    : null

  return (
    <div
      ref={reportRef}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        background: '#ffffff',
        color: '#000000',
        padding: '48px',
        fontFamily: 'Georgia, serif',
      }}
    >
      {/* ── Formal header ── */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>
              reviVAI Clinical Tracking Report
            </h1>
            <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              AI-Powered Rehabilitation Intelligence Platform
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#555' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>CONFIDENTIAL</p>
            <p style={{ margin: '2px 0 0' }}>Generated: {today}</p>
          </div>
        </div>
      </div>

      {/* ── Attending physician ── */}
      <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#f5f5f5', borderLeft: '4px solid #000' }}>
        <p style={{ margin: 0, fontSize: '13px' }}>
          <strong>Attending Physician:</strong> Dr. Viren &nbsp;|&nbsp;
          <strong>Report Type:</strong> Patient Compliance & Form Analysis &nbsp;|&nbsp;
          <strong>Classification:</strong> Clinical Use Only
        </p>
      </div>

      {/* ── Patient identity ── */}
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>
        Patient Profile
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '13px' }}>
        <tbody>
          {[
            ['Full Name',       patient.name],
            ['Patient ID',      `#${patient._id.slice(-8).toUpperCase()}`],
            ['Email',           patient.email],
            ['Condition',       patient.condition || 'General Rehabilitation'],
            ['Status',          'Active'],
            ['Next Appointment', patient.nextAppointment
              ? new Date(patient.nextAppointment).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Not scheduled'],
          ].map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold', width: '200px', background: '#fafafa' }}>{label}</td>
              <td style={{ padding: '8px 12px' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Compliance summary ── */}
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>
        Compliance Summary
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '13px' }}>
        <tbody>
          {[
            ['Current Compliance Score', patient.complianceScore !== null ? `${patient.complianceScore}%` : 'No data'],
            ['Compliance Status',        complianceLabel(patient.complianceScore)],
            ['Sessions Analysed',        `${patient.recentFormScores.length}`],
            ['Average Form Score',       avg !== null ? `${avg}%` : 'Insufficient data'],
            ['Highest Form Score',       patient.recentFormScores.length ? `${Math.max(...patient.recentFormScores)}%` : '—'],
            ['Lowest Form Score',        patient.recentFormScores.length ? `${Math.min(...patient.recentFormScores)}%` : '—'],
          ].map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold', width: '200px', background: '#fafafa' }}>{label}</td>
              <td style={{ padding: '8px 12px' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Form score data table ── */}
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>
        Session Form Score History
      </h2>
      {patient.recentFormScores.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#777', marginBottom: '28px' }}>No session data recorded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Session #</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Form Score</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>vs Average</th>
            </tr>
          </thead>
          <tbody>
            {patient.recentFormScores.map((score, i) => {
              const status = score >= 80 ? 'Good' : score >= 60 ? 'Moderate' : 'At Risk'
              const diff   = avg !== null ? score - avg : null
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px' }}>Session {i + 1}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{score}%</td>
                  <td style={{ padding: '8px 12px' }}>{status}</td>
                  <td style={{ padding: '8px 12px', color: diff === null ? '#999' : diff >= 0 ? '#16a34a' : '#dc2626' }}>
                    {diff === null ? '—' : diff >= 0 ? `+${diff}%` : `${diff}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: '16px', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
        <span>reviVAI · AI-Powered Rehabilitation Platform · Confidential Clinical Document</span>
        <span>Generated {new Date().toISOString().slice(0, 10)}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PatientDeepDive — right panel
───────────────────────────────────────────── */
function PatientDeepDive({
  patient,
  onDownload,
  downloadingId,
  onHistory,
  onPlan,
}: {
  patient: TriagePatient
  onDownload: (id: string) => void
  downloadingId: string | null
  onHistory: (p: TriagePatient) => void
  onPlan: (p: TriagePatient) => void
}) {
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const chartData = patient.recentFormScores.map((score, i) => ({ session: i + 1, score }))
  const avg = patient.recentFormScores.length
    ? Math.round(patient.recentFormScores.reduce((a, b) => a + b, 0) / patient.recentFormScores.length)
    : null

  /* ── PDF generation ── */
  const generatePDF = useCallback(async () => {
    if (!reportRef.current) return
    setGeneratingPdf(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(reportRef.current, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
      })

      const imgData   = canvas.toDataURL('image/png')
      const pdf       = new jsPDF('p', 'mm', 'a4')
      const pageW     = pdf.internal.pageSize.getWidth()
      const pageH     = pdf.internal.pageSize.getHeight()
      const imgW      = pageW
      const imgH      = (canvas.height * imgW) / canvas.width
      const margin    = 0

      // If content is taller than one page, split across pages
      let yOffset = 0
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, -yOffset, imgW, imgH)
        yOffset += pageH
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const safeName = patient.name.replace(/\s+/g, '_')
      pdf.save(`${safeName}_Clinical_Report_${dateStr}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }, [patient])

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Hidden PDF template (off-screen) ── */}
      <PdfReportTemplate patient={patient} reportRef={reportRef} />

      {/* ── Identity card ── */}
      <GlassCard glow className="p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/40 to-cyan-500/40 border border-white/10 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{patient.name}</h2>
                <p className="text-white/50 text-sm mt-0.5">{patient.condition}</p>
              </div>

              {/* ── Generate Medical Report button ── */}
              <button
                type="button"
                onClick={generatePDF}
                disabled={generatingPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shrink-0"
              >
                {generatingPdf
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                  : <><FileDown className="h-3.5 w-3.5" /> Generate Medical Report</>}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${complianceBg(patient.complianceScore)}`}>
                <ComplianceIcon score={patient.complianceScore} />
                <span className={complianceColor(patient.complianceScore)}>
                  {patient.complianceScore !== null ? `${patient.complianceScore}% compliance` : 'No data yet'}
                </span>
              </span>
              {patient.nextAppointment && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(patient.nextAppointment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/8">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Email</p>
            <p className="text-xs text-white/60 truncate">{patient.email}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Patient ID</p>
            <p className="text-xs text-white/60 font-mono">#{patient._id.slice(-8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Status</p>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <Activity className="h-3 w-3" /> Active
            </span>
          </div>
        </div>
      </GlassCard>

      {/* ── Form score chart ── */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Form Score Trend</h3>
            <p className="text-[11px] text-white/35 mt-0.5">
              Live from MongoDB · Last {patient.recentFormScores.length} sessions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon scores={patient.recentFormScores} />
            {avg !== null && (
              <span className={`text-sm font-bold ${complianceColor(avg)}`}>{avg}% avg</span>
            )}
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
        </div>

        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="session" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `S${v}`} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              {avg !== null && (
                <ReferenceLine y={avg} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4"
                  label={{ value: `avg ${avg}%`, fill: 'rgba(255,255,255,0.25)', fontSize: 10, position: 'insideTopRight' }} />
              )}
              <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2.5}
                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#06b6d4', stroke: 'rgba(6,182,212,0.4)', strokeWidth: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-white/10" />
            <p className="text-white/25 text-sm">Not enough session data yet</p>
            <p className="text-white/15 text-xs">Needs at least 2 scored sessions</p>
          </div>
        )}
      </GlassCard>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onHistory(patient)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 text-sm font-medium transition-colors">
          <FileText className="h-4 w-4" /> Medical History
        </button>
        <button type="button" onClick={() => { window.location.href = `mailto:${encodeURIComponent(patient.email)}` }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 text-white/80 hover:text-white text-sm font-medium transition-colors">
          <Mail className="h-4 w-4" /> Message
        </button>
        <button type="button" disabled={downloadingId === patient._id} onClick={() => onDownload(patient._id)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-400 text-sm font-medium transition-colors">
          {downloadingId === patient._id
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
            : <><Download className="h-4 w-4" /> Download Report</>}
        </button>
        <button type="button" onClick={() => onPlan(patient)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-400 text-sm font-medium transition-colors">
          <ListChecks className="h-4 w-4" /> Personalize Plan
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main inner component
───────────────────────────────────────────── */
function PatientsPageInner() {
  const [patients, setPatients]               = useState<TriagePatient[]>([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [selected, setSelected]               = useState<TriagePatient | null>(null)
  const [downloadingId, setDownloadingId]     = useState<string | null>(null)
  const [planOpen, setPlanOpen]               = useState(false)
  const [planPatientId, setPlanPatientId]     = useState<string | null>(null)
  const [planPatientName, setPlanPatientName] = useState('')
  const [planEnabled, setPlanEnabled]         = useState(false)
  const [selExerciseSlugs, setSelExerciseSlugs] = useState<Set<string>>(new Set())
  const [selGameSlugs, setSelGameSlugs]       = useState<Set<string>>(new Set())
  const [planLoading, setPlanLoading]         = useState(false)
  const [planSaving, setPlanSaving]           = useState(false)
  const [historyOpen, setHistoryOpen]         = useState(false)
  const [historyPatientName, setHistoryPatientName] = useState('')
  const [historyText, setHistoryText]         = useState<string | null>(null)
  const [historyLoading, setHistoryLoading]   = useState(false)

  const router       = useRouter()
  const searchParams = useSearchParams()
  const focusId      = searchParams.get('focus')

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/doctor/triage`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data: TriagePatient[] = await res.json()
          setPatients(data)
          const target = focusId ? data.find((p) => p._id === focusId) : data[0]
          if (target) setSelected(target)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [router, focusId])

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const downloadHealthRecords = useCallback(async (patientId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setDownloadingId(patientId)
    try {
      const res = await fetch(`${API}/dashboard/doctor/patients/${patientId}/health-report-pdf`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Could not download.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `patient_${patientId.slice(-8)}_health.pdf`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { alert('Download failed.') }
    finally { setDownloadingId(null) }
  }, [])

  const openMedicalHistory = useCallback(async (patient: TriagePatient) => {
    setHistoryPatientName(patient.name); setHistoryText(null)
    setHistoryOpen(true); setHistoryLoading(true)
    const token = localStorage.getItem('token')
    if (!token) { setHistoryLoading(false); return }
    try {
      const res = await fetch(`${API}/users/doctor/patients/${patient._id}/medical-history`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setHistoryText(d.medicalHistory || null) }
      else setHistoryText(null)
    } catch { setHistoryText(null) }
    finally { setHistoryLoading(false) }
  }, [])

  const openPlanModal = useCallback(async (patient: TriagePatient) => {
    setPlanPatientId(patient._id); setPlanPatientName(patient.name)
    setPlanOpen(true); setPlanLoading(true)
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/users/doctor/patients/${patient._id}/plan`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        setPlanEnabled(!!d.doctorPersonalizationEnabled)
        setSelExerciseSlugs(new Set(d.assignedExerciseSlugs || []))
        setSelGameSlugs(new Set(d.assignedCognitiveGameSlugs || []))
      }
    } catch { alert('Could not load plan.') }
    finally { setPlanLoading(false) }
  }, [])

  const toggleSlug = (set: Set<string>, slug: string, update: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(slug) ? next.delete(slug) : next.add(slug); update(next)
  }

  const savePlan = async () => {
    if (!planPatientId) return
    const token = localStorage.getItem('token'); if (!token) return
    setPlanSaving(true)
    try {
      const res = await fetch(`${API}/users/doctor/patients/${planPatientId}/plan`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorPersonalizationEnabled: planEnabled, exerciseSlugs: Array.from(selExerciseSlugs), gameSlugs: Array.from(selGameSlugs) }),
      })
      if (res.ok) setPlanOpen(false)
      else { const e = await res.json().catch(() => ({})); alert(e.error || 'Could not save plan.') }
    } catch { alert('Could not save plan.') }
    finally { setPlanSaving(false) }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Patient Info</h1>
        <p className="text-white/60 mt-1">Select a patient to view their live compliance data and generate clinical reports.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* LEFT: patient list */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input type="text" placeholder="Search patients…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors" />
          </div>
          <GlassCard className="overflow-hidden">
            {loading ? (
              <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center px-4"><Users className="h-8 w-8 mx-auto mb-2 text-white/10" /><p className="text-white/25 text-xs">No patients found</p></div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((p) => {
                  const isActive = selected?._id === p._id
                  return (
                    <button key={p._id} type="button" onClick={() => setSelected(p)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 ${isActive ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'}`}>
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${isActive ? 'bg-gradient-to-br from-cyan-500/50 to-violet-500/50 border border-cyan-500/40 text-white' : 'bg-white/8 border border-white/10 text-white/60'}`}>
                        {p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/70'}`}>{p.name}</p>
                        <p className="text-[11px] text-white/30 truncate">{p.condition}</p>
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${complianceColor(p.complianceScore)}`}>
                        {p.complianceScore !== null ? `${p.complianceScore}%` : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </GlassCard>
          {!loading && <p className="text-[11px] text-white/20 text-center">{filtered.length} patient{filtered.length !== 1 ? 's' : ''}{searchQuery ? ' matching' : ' assigned'}</p>}
        </div>

        {/* RIGHT: deep-dive */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-5"><Skeleton className="h-48" /><Skeleton className="h-64" /><Skeleton className="h-24" /></div>
          ) : selected ? (
            <PatientDeepDive patient={selected} onDownload={downloadHealthRecords} downloadingId={downloadingId} onHistory={openMedicalHistory} onPlan={openPlanModal} />
          ) : (
            <GlassCard className="flex flex-col items-center justify-center py-24 text-center">
              <ChevronRight className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Select a patient from the list</p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Medical History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2 tracking-tight"><FileText className="h-5 w-5 text-cyan-400" />Medical History — {historyPatientName}</DialogTitle></DialogHeader>
          <div className="py-2">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-cyan-400 animate-spin" /></div>
            ) : historyText ? (
              <div className="space-y-1">
                <p className="text-xs text-cyan-400/70 mb-4 uppercase tracking-widest font-semibold flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />Extracted via Gemini 2.5 OCR</p>
                {historyText.split('\n').filter(Boolean).map((line, i) => {
                  const isBullet = /^[-•*]/.test(line.trim()); const isHeader = line.trim().endsWith(':') || /^\*\*.*\*\*/.test(line.trim())
                  const clean = line.replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim()
                  if (!clean) return null
                  if (isHeader) return <p key={i} className="text-cyan-300 font-semibold text-sm mt-5 mb-1 first:mt-0 border-b border-white/5 pb-1">{clean}</p>
                  if (isBullet) return <div key={i} className="flex gap-2 text-sm text-white/55 py-0.5 pl-2"><span className="text-cyan-400 shrink-0 mt-0.5">•</span><span>{clean}</span></div>
                  return <p key={i} className="text-sm text-white/55 py-0.5">{clean}</p>
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center"><FileText className="h-10 w-10 text-white/10" /><p className="text-white/30 text-sm">No medical history uploaded yet.</p></div>
            )}
          </div>
          <DialogFooter><button onClick={() => setHistoryOpen(false)} className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Close</button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Modal */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white tracking-tight">Personalized Plan — {planPatientName}</DialogTitle></DialogHeader>
          {planLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-cyan-400 animate-spin" /></div> : (
            <div className="space-y-5 py-2">
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={planEnabled} onChange={(e) => setPlanEnabled(e.target.checked)} className="accent-cyan-400" /><span className="text-sm text-white/80">Limit patient app to only the exercises and games selected below</span></label>
              <p className="text-xs text-white/30">When enabled, the patient will not see other activities until you change this again.</p>
              <div><p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Exercises</p><div className="grid gap-2 max-h-40 overflow-y-auto pr-1">{ALL_EXERCISES.map((ex) => (<label key={ex.slug} className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={selExerciseSlugs.has(ex.slug)} onChange={() => toggleSlug(selExerciseSlugs, ex.slug, setSelExerciseSlugs)} className="accent-cyan-400" />{ex.name}{ex.hasAI && <span className="text-[10px] text-cyan-400 font-semibold">AI</span>}</label>))}</div></div>
              <div><p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Cognitive Games</p><div className="grid gap-2 max-h-40 overflow-y-auto pr-1">{ALL_COGNITIVE_GAMES.map((g) => (<label key={g.slug} className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={selGameSlugs.has(g.slug)} onChange={() => toggleSlug(selGameSlugs, g.slug, setSelGameSlugs)} className="accent-cyan-400" />{g.name}</label>))}</div></div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <button type="button" onClick={() => setPlanOpen(false)} className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Cancel</button>
            <button type="button" disabled={planLoading || planSaving} onClick={savePlan} className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">{planSaving ? 'Saving…' : 'Save Plan'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-white/30">Loading patient directory…</div>}>
      <PatientsPageInner />
    </Suspense>
  )
}
