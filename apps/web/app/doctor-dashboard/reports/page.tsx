'use client'

import { FileText, Download, Filter, Search, CheckCircle2, History } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'

type StatusFilter = 'all' | 'Pending Review' | 'Normal' | 'Requires Attention'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

export default function ReportsPage() {
  const [reports, setReports]         = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/doctor/reports`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setReports(await res.json() || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [router])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (r.patientId?.name || '').toLowerCase().includes(q) ||
        (r.reportId || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        r.status === statusFilter ||
        (statusFilter === 'Requires Attention' && (r.critical || r.status === 'Requires Attention'))
      return matchesSearch && matchesStatus
    })
  }, [reports, searchQuery, statusFilter])

  const pendingCount  = reports.filter((r) => r.status === 'Pending Review').length
  const criticalCount = reports.filter((r) => r.critical || r.status === 'Requires Attention').length
  const normalCount   = reports.filter((r) => r.status === 'Normal').length

  const downloadReportPdf = async (reportId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/dashboard/doctor/reports/${reportId}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Could not download PDF.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `RevivAI_report_${reportId}.pdf`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { alert('Download failed.') }
  }

  const markReviewed = async (reportId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setReviewingId(reportId)
    try {
      const res = await fetch(`${API}/dashboard/doctor/reports/${reportId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Normal', critical: false }),
      })
      if (res.ok) { const updated = await res.json(); setReports((prev) => prev.map((r) => r._id === reportId ? updated : r)) }
      else alert('Could not update report.')
    } catch { alert('Could not update report.') }
    finally { setReviewingId(null) }
  }

  const filterLabel =
    statusFilter === 'all' ? 'All statuses' :
    statusFilter === 'Requires Attention' ? 'Action required' : statusFilter

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Lab Reports</h1>
          <p className="text-white/60 mt-1">Review, approve, and analyze patient test results.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 text-white/80 hover:text-white text-sm font-medium transition-colors outline-none">
              <Filter className="h-4 w-4" /> {filterLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#0a0a0a] border-white/10 text-white min-w-[12rem]">
              {(['all', 'Pending Review', 'Normal', 'Requires Attention'] as StatusFilter[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="focus:bg-white/10">
                  {s === 'all' ? 'All statuses' : s === 'Requires Attention' ? 'Action required' : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input
              type="text"
              placeholder="Search reports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-56 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Status overview */}
        <GlassCard className="p-6 md:col-span-1 h-fit">
          <h3 className="text-base font-semibold text-white mb-5">Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white/50">
                <History className="h-4 w-4" /> Pending
              </span>
              <span className="font-bold text-white">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-red-400">
                <FileText className="h-4 w-4" /> Action Required
              </span>
              <span className="font-bold text-white">{criticalCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Normal
              </span>
              <span className="font-bold text-white">{normalCount}</span>
            </div>
          </div>
        </GlassCard>

        {/* Report list */}
        <div className="md:col-span-3 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : filteredReports.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">
              {reports.length === 0 ? 'No lab reports found.' : 'No reports match your search or filter.'}
            </p>
          ) : (
            filteredReports.map((report) => (
              <GlassCard
                key={report._id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    report.status === 'Normal'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : report.critical
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{report.patientId?.name || 'Unknown Patient'}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                      <span className="text-cyan-400 font-medium">{report.reportId}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40">{report.type}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40">{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.status === 'Normal'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : report.critical
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {report.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadReportPdf(report._id)}
                    className="p-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === report._id || report.status === 'Normal'}
                    onClick={() => markReviewed(report._id)}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {reviewingId === report._id ? 'Saving…' : report.status === 'Normal' ? 'Reviewed' : 'Review'}
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
