'use client'

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Users, Search, Activity, Mail, Calendar, ListChecks, FileText, Download } from "lucide-react"
import { ALL_EXERCISES, ALL_COGNITIVE_GAMES } from "@/lib/activity-catalog"

const API = 'http://localhost:5000/api'

function PatientsPageInner() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [planPatientId, setPlanPatientId] = useState<string | null>(null)
  const [planPatientName, setPlanPatientName] = useState('')
  const [planEnabled, setPlanEnabled] = useState(false)
  const [selExerciseSlugs, setSelExerciseSlugs] = useState<Set<string>>(new Set())
  const [selGameSlugs, setSelGameSlugs] = useState<Set<string>>(new Set())
  const [planLoading, setPlanLoading] = useState(false)
  const [planSaving, setPlanSaving] = useState(false)
  // Medical history modal
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyPatientName, setHistoryPatientName] = useState('')
  const [historyText, setHistoryText] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusId = searchParams.get('focus')
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('http://localhost:5000/api/users/associations', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setPatients(data.patients || [])
        }
      } catch (error) {
        console.error('Failed to fetch patients', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [router])

  useEffect(() => {
    if (!focusId || loading) return
    const el = cardRefs.current[focusId]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusId, loading, patients])

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const downloadHealthRecords = async (patientId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setDownloadingId(patientId)
    try {
      const res = await fetch(
        `http://localhost:5000/api/dashboard/doctor/patients/${patientId}/health-report-pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Could not download health report.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `patient_${patientId.slice(-8)}_health.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed.')
    } finally {
      setDownloadingId(null)
    }
  }

  const openMessage = (email: string) => {
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Message from your care team')}`
  }

  const openMedicalHistory = async (patient: { _id: string; name: string; medicalHistory?: string }) => {
    setHistoryPatientName(patient.name)
    setHistoryText(null)
    setHistoryOpen(true)
    setHistoryLoading(true)
    const token = localStorage.getItem('token')
    if (!token) { setHistoryLoading(false); return }
    try {
      const res = await fetch(`${API}/users/doctor/patients/${patient._id}/medical-history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const d = await res.json()
        setHistoryText(d.medicalHistory || null)
      } else {
        setHistoryText(null)
      }
    } catch {
      setHistoryText(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  const openPlanModal = async (patient: { _id: string; name: string }) => {
    setPlanPatientId(patient._id)
    setPlanPatientName(patient.name)
    setPlanOpen(true)
    setPlanLoading(true)
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/users/doctor/patients/${patient._id}/plan`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setPlanEnabled(!!d.doctorPersonalizationEnabled)
        setSelExerciseSlugs(new Set(d.assignedExerciseSlugs || []))
        setSelGameSlugs(new Set(d.assignedCognitiveGameSlugs || []))
      }
    } catch {
      alert('Could not load plan.')
    } finally {
      setPlanLoading(false)
    }
  }

  const toggleSlug = (set: Set<string>, slug: string, update: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    update(next)
  }

  const savePlan = async () => {
    if (!planPatientId) return
    const token = localStorage.getItem('token')
    if (!token) return
    setPlanSaving(true)
    try {
      const res = await fetch(`${API}/users/doctor/patients/${planPatientId}/plan`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorPersonalizationEnabled: planEnabled,
          exerciseSlugs: Array.from(selExerciseSlugs),
          gameSlugs: Array.from(selGameSlugs),
        }),
      })
      if (res.ok) {
        setPlanOpen(false)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Could not save plan.')
      }
    } catch {
      alert('Could not save plan.')
    } finally {
      setPlanSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Patient Directory</h1>
          <p className="text-neutral-400">View and manage your assigned patients.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-neutral-400">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            Loading patient records...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-neutral-400">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No patients found matching your criteria.</p>
          </div>
        ) : (
          filteredPatients.map((patient, patientIndex) => (
            <div
              key={patient._id}
              ref={(el) => {
                cardRefs.current[patient._id] = el
              }}
            >
            <Card
              className={`bg-black border-white/10 overflow-hidden hover:border-white/20 transition-all group ${
                focusId === patient._id ? 'ring-2 ring-blue-500/50 border-blue-500/30' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg font-bold text-white">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{patient.name}</h3>
                      <p className="text-sm text-neutral-400">PID: #{String(patient._id).slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Mail className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Calendar className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span>Registered: {new Date(patient.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Activity className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Status: Active</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openMedicalHistory(patient)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Medical History
                    </button>
                    <button
                      type="button"
                      onClick={() => openMessage(patient.email)}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Message
                    </button>
                  </div>
                  {/* Download Report — real for first two patients, dummy for rest */}
                  {patientIndex <= 1 ? (
                    <button
                      type="button"
                      disabled={downloadingId === patient._id}
                      onClick={() => downloadHealthRecords(patient._id)}
                      className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingId === patient._id ? 'Preparing PDF…' : 'Download Report'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert('Report generation coming soon for this patient.')}
                      className="w-full py-2 bg-white/5 text-neutral-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Report
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openPlanModal(patient)}
                    className="w-full py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ListChecks className="h-4 w-4" />
                    Personalize exercises & games
                  </button>
                </div>
              </div>
            </Card>
            </div>
          ))
        )}
      </div>

      {/* Medical History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-neutral-950 border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Medical History — {historyPatientName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : historyText ? (
              <div className="space-y-1">
                <p className="text-xs text-blue-400/80 mb-4 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                  Extracted via Gemini 2.5 OCR
                </p>
                {historyText.split('\n').filter(Boolean).map((line, i) => {
                  const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')
                  const isHeader = line.trim().endsWith(':') || /^\*\*.*\*\*/.test(line.trim())
                  const clean = line.replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim()
                  if (!clean) return null
                  if (isHeader) return (
                    <p key={i} className="text-blue-300 font-semibold text-sm mt-5 mb-1 first:mt-0 border-b border-white/5 pb-1">{clean}</p>
                  )
                  if (isBullet) return (
                    <div key={i} className="flex gap-2 text-sm text-neutral-300 py-0.5 pl-2">
                      <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                      <span>{clean}</span>
                    </div>
                  )
                  return <p key={i} className="text-sm text-neutral-300 py-0.5">{clean}</p>
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <FileText className="h-10 w-10 text-neutral-600" />
                <p className="text-neutral-400 text-sm">This patient has not uploaded their medical history yet.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>        <DialogContent className="bg-neutral-950 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Personalized plan — {planPatientName}</DialogTitle>
          </DialogHeader>
          {planLoading ? (
            <p className="text-neutral-400 text-sm py-8 text-center">Loading current plan…</p>
          ) : (
            <div className="space-y-4 py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planEnabled}
                  onChange={(e) => setPlanEnabled(e.target.checked)}
                  className="rounded border-white/20"
                />
                <span className="text-sm text-neutral-200">
                  Limit patient app to only the exercises and games selected below
                </span>
              </label>
              <p className="text-xs text-neutral-500">
                When enabled, the patient will not see other activities until you change this again.
              </p>

              <div>
                <p className="text-sm font-medium text-white mb-2">Exercises</p>
                <div className="grid gap-2 max-h-40 overflow-y-auto pr-1">
                  {ALL_EXERCISES.map((ex) => (
                    <label
                      key={ex.slug}
                      className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selExerciseSlugs.has(ex.slug)}
                        onChange={() => toggleSlug(selExerciseSlugs, ex.slug, setSelExerciseSlugs)}
                      />
                      {ex.name}
                      {ex.hasAI && <span className="text-[10px] text-blue-400">AI</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-white mb-2">Cognitive games</p>
                <div className="grid gap-2 max-h-40 overflow-y-auto pr-1">
                  {ALL_COGNITIVE_GAMES.map((g) => (
                    <label
                      key={g.slug}
                      className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selGameSlugs.has(g.slug)}
                        onChange={() => toggleSlug(selGameSlugs, g.slug, setSelGameSlugs)}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={planLoading || planSaving}
              onClick={savePlan}
            >
              {planSaving ? 'Saving…' : 'Save plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto py-12 text-center text-neutral-400">
          Loading patient directory…
        </div>
      }
    >
      <PatientsPageInner />
    </Suspense>
  )
}
