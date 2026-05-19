'use client'

import { Card } from "@workspace/ui/components/card"
import { Users, FileText, CheckSquare, Activity } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const ICONS: Record<string, any> = {
  Users, FileText, CheckSquare, Activity
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const [patientsRes, dashRes] = await Promise.all([
          fetch('http://localhost:5000/api/users/associations', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/dashboard/doctor', { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        
        if (patientsRes.ok) {
          const data = await patientsRes.json()
          setPatients(data.patients || [])
        }
        if (dashRes.ok) {
          const dashData = await dashRes.json()
          setDashboardData(dashData)
        }
      } catch (error) {
        console.error('Failed to fetch patients', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [router])

  const refreshDashboard = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const dashRes = await fetch('http://localhost:5000/api/dashboard/doctor', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (dashRes.ok) {
      const dashData = await dashRes.json()
      setDashboardData(dashData)
    }
  }, [])

  const markTaskComplete = async (taskId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`http://localhost:5000/api/dashboard/doctor/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      })
      if (res.ok) {
        setDashboardData((prev: any) => {
          if (!prev?.actionItems) return prev
          return {
            ...prev,
            actionItems: prev.actionItems.filter((t: any) => t._id !== taskId),
          }
        })
        await refreshDashboard()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6 flex flex-col max-w-6xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Doctor</h1>
        <p className="text-neutral-400">Here's what is happening with your patients today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData?.stats?.map((stat: any, i: number) => {
          const Icon = ICONS[stat.iconName] || Users;
          return (
            <Card key={i} className="bg-black border-white/10 p-6 flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2 bg-black border-white/10 p-6 min-h-[400px]">
          <h2 className="text-xl font-bold mb-6">Your Assigned Patients</h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-neutral-400">Loading patients...</p>
            ) : patients.length === 0 ? (
              <p className="text-neutral-400">No patients assigned to you yet.</p>
            ) : (
              patients.map(patient => (
                <div key={patient._id} className="flex flex-col p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-400">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{patient.name}</h3>
                        <p className="text-sm text-neutral-400">{patient.email}</p>
                      </div>
                    </div>
                    <Link
                      href={`/doctor-dashboard/patients?focus=${patient._id}`}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors text-sm rounded-lg inline-block text-center"
                    >
                      View Profile
                    </Link>
                  </div>
                  {patient.medicalHistory && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Patient Medical History (OCR)</h4>
                      <div className="text-sm text-neutral-300 bg-black/40 p-3 rounded overflow-auto max-h-32 whitespace-pre-wrap border border-white/5">
                        {patient.medicalHistory}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="bg-black border-white/10 p-6 min-h-[400px]">
          <h2 className="text-xl font-bold mb-6">Action Items</h2>
          <div className="space-y-4">
            {dashboardData?.actionItems?.map((task: any) => (
              <div key={task._id} className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <button
                  type="button"
                  onClick={() => markTaskComplete(task._id)}
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-white/20 bg-black text-neutral-400 hover:bg-white/10 hover:text-white"
                  title="Mark complete"
                  aria-label="Mark task complete"
                >
                  <CheckSquare className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm">{task.title}</h3>
                  <p className="text-xs text-neutral-400 mt-1">Patient: {task.patientId?.name || 'Unknown'}</p>
                </div>
              </div>
            ))}
            {!dashboardData?.actionItems?.length && !loading && (
              <p className="text-neutral-400 text-sm">No action items.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
