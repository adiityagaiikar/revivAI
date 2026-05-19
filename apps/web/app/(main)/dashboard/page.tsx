'use client'

import { Card } from "@workspace/ui/components/card"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { 
  Activity, 
  Flame, 
  Timer, 
  Trophy,
  TrendingUp,
  Calendar,
  Users,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePatientPlan } from "@/hooks/usePatientPlan"
import { ALL_EXERCISES, ALL_COGNITIVE_GAMES, filterExercisesByPlan, filterGamesByPlan, type PatientPlan } from "@/lib/activity-catalog"
import { API } from '@/lib/api'

const ICONS: Record<string, any> = {
  Activity, Flame, Timer, Trophy
}

export default function DashboardPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [medicalHistory, setMedicalHistory] = useState<string | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const router = useRouter()
  const { plan, loading: planLoading } = usePatientPlan()
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API}/history/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        alert('Medical history securely extracted via Google Gemini and saved! Your doctor can now access it.')
        // Refresh medical history display
        const meRes = await fetch(`${API}/history/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (meRes.ok) {
          const d = await meRes.json()
          setMedicalHistory(d.medicalHistory || null)
        }
      } else {
        alert('Upload failed. Make sure GEMINI_API_KEY is configured in backend settings.')
      }
    } catch (err) {
      console.error(err)
      alert('Error extracting PDF.')
    } finally {
      setUploading(false)
    }
  }

  const assignedExerciseCount = useMemo(() => {
    return filterExercisesByPlan(ALL_EXERCISES, plan as PatientPlan | null).length
  }, [plan])
  const assignedGameCount = useMemo(() => {
    return filterGamesByPlan(ALL_COGNITIVE_GAMES, plan as PatientPlan | null).length
  }, [plan])

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        router.push('/login')
        return
      }

      try {
        const [doctorsRes, dashRes] = await Promise.all([
          fetch(`${API}/users/associations`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API}/dashboard/patient`, { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        
        if (doctorsRes.ok) {
          const data = await doctorsRes.json()
          setDoctors(data.doctors || [])
        }
        if (dashRes.ok) {
          const dashData = await dashRes.json()
          setDashboardData(dashData)
        }

        // Fetch patient's own OCR-extracted medical history
        const histRes = await fetch(`${API}/history/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (histRes.ok) {
          const histData = await histRes.json()
          setMedicalHistory(histData.medicalHistory || null)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [router])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <Spotlight
          className="-top-20 left-0"
          fill="white"
        />
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-neutral-400">Track your fitness and cognitive progress</p>
          </div>
          <div className="flex flex-col items-end">
            <label className={`cursor-pointer ${uploading ? 'bg-neutral-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg flex border border-blue-500 shadow-md transition-colors items-center gap-2`}>
              <Upload className="h-4 w-4" />
              {uploading ? 'Extracting via Gemini...' : 'Upload Medical History (PDF)'}
              <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <p className="text-[10px] text-blue-300 mt-1 uppercase tracking-wider font-semibold">Gemini 2.5 OCR &gt;95% Accuracy</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData?.stats?.map((stat: any) => {
          const Icon = ICONS[stat.iconName] || Activity
          return (
            <Card key={stat.name} className="bg-black/[0.96] border-white/10 p-6 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-neutral-400 text-sm mb-1">{stat.name}</p>
                  <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-sm">{stat.change}</span>
                    <span className="text-neutral-500 text-sm ml-1">vs last week</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <Calendar className="h-5 w-5 text-neutral-400" />
          </div>
          
          <div className="space-y-4">
            {dashboardData?.activities?.map((activity: any, index: number) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'Fitness' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {activity.type === 'Fitness' ? <Activity className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{activity.name}</p>
                    <p className="text-sm text-neutral-400">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    {activity.duration || activity.score}
                  </p>
                  <p className="text-sm text-neutral-400">{activity.type}</p>
                </div>
              </div>
            ))}
            {!dashboardData?.activities?.length && !loading && (
              <p className="text-neutral-400">No recent activity found.</p>
            )}
          </div>
        </Card>

        {/* Weekly Progress */}
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Weekly Progress</h2>
            <Activity className="h-5 w-5 text-neutral-400" />
          </div>
          
          <div className="space-y-6">
            {/* Progress Bars */}
            {dashboardData?.weeklyProgress?.map((item: any) => (
              <div key={item.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-neutral-300">{item.label}</span>
                  <span className="text-white font-medium">
                    {item.value}{item.max ? `/${item.max}` : '%'}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.value / (item.max || 100)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-neutral-400 mb-2">Quick Actions</h3>
            {plan?.enabled && !planLoading && (
              <p className="text-xs text-blue-400/80 mb-3">
                Your doctor assigned {assignedExerciseCount} exercise{assignedExerciseCount !== 1 ? 's' : ''} and{' '}
                {assignedGameCount} cognitive game{assignedGameCount !== 1 ? 's' : ''}.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/exercises"
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors text-left block"
              >
                Exercises
              </Link>
              <Link
                href="/cognitive-games"
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors text-left block"
              >
                Cognitive games
              </Link>
            </div>
          </div>
        </Card>

        {/* Medical History (OCR extracted) */}
        <Card className="lg:col-span-2 bg-black/[0.96] border-blue-500/20 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">My Medical History</h2>
                <p className="text-xs text-blue-400/80">Extracted via Gemini 2.5 OCR · Visible to your doctor</p>
              </div>
            </div>
            {medicalHistory && (
              <button
                onClick={() => setHistoryExpanded(e => !e)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-neutral-300 transition-colors"
              >
                {historyExpanded ? <><ChevronUp className="h-4 w-4" /> Hide</> : <><ChevronDown className="h-4 w-4" /> View History</>}
              </button>
            )}
          </div>

          {!medicalHistory ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
              <p className="text-neutral-400 text-sm">No medical history uploaded yet.</p>
              <label className={`cursor-pointer ${uploading ? 'bg-neutral-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors`}>
                <Upload className="h-4 w-4" />
                {uploading ? 'Extracting via Gemini...' : 'Upload Medical History (PDF)'}
                <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          ) : historyExpanded ? (
            <div className="mt-2">
              {medicalHistory.split('\n').filter(Boolean).map((line, i) => {
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')
                const isHeader = line.trim().endsWith(':') || /^\*\*.*\*\*$/.test(line.trim())
                const clean = line.replace(/^\*\*/,'').replace(/\*\*$/,'').replace(/^[-•*]\s*/,'').trim()
                if (!clean) return null
                if (isHeader) return (
                  <p key={i} className="text-blue-300 font-semibold text-sm mt-4 mb-1 first:mt-0">{clean}</p>
                )
                if (isBullet) return (
                  <div key={i} className="flex gap-2 text-sm text-neutral-300 py-0.5">
                    <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                    <span>{clean}</span>
                  </div>
                )
                return <p key={i} className="text-sm text-neutral-300 py-0.5">{clean}</p>
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Medical history on file. Click "View History" to expand.</p>
          )}
        </Card>

        {/* Your Care Team / Doctors */}
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-6 mt-6">          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Your Care Team</h2>
            <Users className="h-5 w-5 text-neutral-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-neutral-400">Loading your doctors...</p>
            ) : doctors.length === 0 ? (
              <p className="text-neutral-400">No doctors assigned to your profile yet.</p>
            ) : (
              doctors.map((doctor, index) => (
                <div key={index} className="flex flex-col gap-3 p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-sm font-bold text-blue-400">
                      Dr
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{doctor.name}</h3>
                      <p className="text-xs text-neutral-400">Assigned Neurologist</p>
                    </div>
                  </div>
                  <button className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 transition-colors text-sm rounded-lg text-white">
                    Contact Doctor
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
