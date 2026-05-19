'use client'

import { Card } from "@workspace/ui/components/card"
import { FileText, Download, Filter, Search, CheckCircle2, History } from "lucide-react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { API } from '@/lib/api'

type StatusFilter = 'all' | 'Pending Review' | 'Normal' | 'Requires Attention'

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch(`${API}/dashboard/doctor/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setReports(data || [])
        }
      } catch (error) {
        console.error('Failed to fetch reports', error)
      } finally {
        setLoading(false)
      }
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

  const pendingCount = reports.filter((r) => r.status === 'Pending Review').length
  const criticalCount = reports.filter(
    (r) => r.critical || r.status === 'Requires Attention'
  ).length
  const normalCount = reports.filter((r) => r.status === 'Normal').length

  const downloadReportPdf = async (reportId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/dashboard/doctor/reports/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Could not download this PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RevivAI_patient_report_${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed.')
    }
  }

  const markReviewed = async (reportId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setReviewingId(reportId)
    try {
      const res = await fetch(`${API}/dashboard/doctor/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Normal', critical: false }),
      })
      if (res.ok) {
        const updated = await res.json()
        setReports((prev) => prev.map((r) => (r._id === reportId ? updated : r)))
      } else {
        alert('Could not update report.')
      }
    } catch {
      alert('Could not update report.')
    } finally {
      setReviewingId(null)
    }
  }

  const filterLabel =
    statusFilter === 'all'
      ? 'All statuses'
      : statusFilter === 'Requires Attention'
        ? 'Action required'
        : statusFilter

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lab Reports</h1>
          <p className="text-neutral-400">Review, approve, and analyze patient test results.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Filter className="h-4 w-4" />
              {filterLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-950 border-white/10 text-white min-w-[12rem]">
              {(
                [
                  'all',
                  'Pending Review',
                  'Normal',
                  'Requires Attention',
                ] as StatusFilter[]
              ).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="focus:bg-white/10"
                >
                  {s === 'all'
                    ? 'All statuses'
                    : s === 'Requires Attention'
                      ? 'Action required'
                      : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-black border-white/10 p-6">
            <h3 className="font-bold mb-4 text-white">Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-400">
                  <History className="h-4 w-4" /> Pending Review
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
                <span className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Normal Result
                </span>
                <span className="font-bold text-white">{normalCount}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-4">
          {loading ? (
            <p className="text-neutral-400">Loading reports...</p>
          ) : filteredReports.length === 0 ? (
            <p className="text-neutral-400">
              {reports.length === 0
                ? 'No lab reports found.'
                : 'No reports match your search or filter.'}
            </p>
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report._id}
                className="bg-black border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`p-3 rounded-xl flex-shrink-0 ${
                      report.status === 'Normal'
                        ? 'bg-green-500/10 text-green-400'
                        : report.critical
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-orange-500/10 text-orange-400'
                    }`}
                  >
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-lg truncate">
                      {report.patientId?.name || 'Unknown Patient'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                      <span className="text-blue-400 font-medium">{report.reportId}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-400">{report.type}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-400">
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'Normal'
                        ? 'bg-green-500/10 text-green-400'
                        : report.critical
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-orange-500/10 text-orange-400'
                    }`}
                  >
                    {report.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadReportPdf(report._id)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === report._id || report.status === 'Normal'}
                    onClick={() => markReviewed(report._id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {reviewingId === report._id
                      ? 'Saving…'
                      : report.status === 'Normal'
                        ? 'Reviewed'
                        : 'Review'}
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
