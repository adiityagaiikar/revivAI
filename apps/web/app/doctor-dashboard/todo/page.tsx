'use client'

import { CheckSquare, Clock, AlertCircle, Plus, MoreVertical, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

export default function TodoPage() {
  const [tasks, setTasks]           = useState<any[]>([])
  const [patients, setPatients]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [addOpen, setAddOpen]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [newTitle, setNewTitle]     = useState('')
  const [newType, setNewType]       = useState('Clinical')
  const [newUrgency, setNewUrgency] = useState('Medium')
  const [newTime, setNewTime]       = useState('')
  const [newPatientId, setNewPatientId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const [tasksRes, assocRes] = await Promise.all([
          fetch(`${API}/dashboard/doctor/tasks`,  { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/users/associations`,       { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (tasksRes.ok) setTasks(await tasksRes.json() || [])
        if (assocRes.ok) { const d = await assocRes.json(); setPatients(d.patients || []) }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [router])

  const completedCount   = tasks.filter((t) => t.completed).length
  const totalCount       = tasks.length
  const progressPercent  = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const highPriorityCount = tasks.filter((t) => !t.completed && t.urgency === 'High').length

  const toggleTask = async (task: any) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      if (res.ok) { const updated = await res.json(); setTasks((prev) => prev.map((t) => t._id === task._id ? updated : t)) }
    } catch (e) { console.error(e) }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setTasks((prev) => prev.filter((t) => t._id !== taskId))
    } catch (e) { console.error(e) }
  }

  const submitNewTask = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle, type: newType, urgency: newUrgency,
          time: newTime || '—', patientId: newPatientId || undefined,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setTasks((prev) => [created, ...prev])
        setAddOpen(false)
        setNewTitle(''); setNewTime(''); setNewPatientId('')
        setNewType('Clinical'); setNewUrgency('Medium')
      } else { alert('Could not create task.') }
    } catch { alert('Could not create task.') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">To Do List</h1>
          <p className="text-white/60 mt-1">Manage your daily tasks and priorities.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {/* ── Add Task Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white tracking-tight">New Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task description"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Time</label>
              <input
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 2:00 PM"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                >
                  <option value="Clinical" className="bg-neutral-900">Clinical</option>
                  <option value="Admin"    className="bg-neutral-900">Admin</option>
                  <option value="Meeting"  className="bg-neutral-900">Meeting</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Urgency</label>
                <select
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
                >
                  <option value="Low"    className="bg-neutral-900">Low</option>
                  <option value="Medium" className="bg-neutral-900">Medium</option>
                  <option value="High"   className="bg-neutral-900">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Patient (optional)</label>
              <select
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
              >
                <option value="" className="bg-neutral-900">None</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id} className="bg-neutral-900">{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !newTitle.trim()}
              onClick={submitNewTask}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              {saving ? 'Saving…' : 'Create Task'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Task list */}
        <GlassCard className="p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-white mb-6">Today's Tasks</h2>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : tasks.length === 0 ? (
              <p className="text-white/30 text-sm">No tasks yet. Add one to get started.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className={`flex items-start justify-between gap-2 p-4 rounded-xl border transition-all ${
                    task.completed
                      ? 'bg-white/[0.01] border-white/5 opacity-50'
                      : 'bg-white/[0.02] border-white/8 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  <div className="flex gap-4 min-w-0">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/20 bg-transparent accent-cyan-400 cursor-pointer"
                        checked={task.completed}
                        onChange={() => toggleTask(task)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${task.completed ? 'line-through text-white/30' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-medium">
                        <span className="flex items-center gap-1 text-white/35">
                          <Clock className="h-3 w-3 shrink-0" /> {task.time}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          task.type === 'Clinical'
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : task.type === 'Meeting'
                              ? 'bg-violet-500/15 text-violet-400'
                              : 'bg-white/8 text-white/50'
                        }`}>
                          {task.type}
                        </span>
                        <span className={`flex items-center gap-1 ${
                          task.urgency === 'High' ? 'text-red-400' : task.urgency === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          <AlertCircle className="h-3 w-3 shrink-0" /> {task.urgency}
                        </span>
                      </div>
                      {task.patientId?.name && (
                        <p className="text-xs text-white/25 mt-1">Patient: {task.patientId.name}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="text-white/25 hover:text-white transition-colors p-1 shrink-0 rounded outline-none"
                      aria-label="Task actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#0a0a0a] border-white/10 text-white min-w-[10rem]">
                      <DropdownMenuItem onClick={() => toggleTask(task)} className="focus:bg-white/10">
                        {task.completed ? 'Mark incomplete' : 'Mark complete'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteTask(task._id)}
                        className="focus:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Overview sidebar */}
        <GlassCard className="p-6 h-fit">
          <h3 className="text-base font-semibold text-white mb-5">Task Overview</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/40">Completed</span>
                <span className="text-white font-semibold">{completedCount}/{totalCount} ({progressPercent}%)</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-white/8">
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/8 border border-red-500/15">
                <span className="text-sm font-medium text-red-400">High Priority</span>
                <span className="text-sm font-bold text-red-400">{highPriorityCount}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
