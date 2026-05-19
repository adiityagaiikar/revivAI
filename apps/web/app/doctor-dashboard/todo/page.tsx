'use client'

import { Card } from "@workspace/ui/components/card"
import { CheckSquare, Clock, AlertCircle, Plus, MoreVertical, Trash2 } from "lucide-react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { API } from '@/lib/api'

export default function TodoPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('Clinical')
  const [newUrgency, setNewUrgency] = useState('Medium')
  const [newTime, setNewTime] = useState('')
  const [newPatientId, setNewPatientId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const [tasksRes, assocRes] = await Promise.all([
          fetch(`${API}/dashboard/doctor/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/users/associations`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (tasksRes.ok) {
          const data = await tasksRes.json()
          setTasks(data || [])
        }
        if (assocRes.ok) {
          const data = await assocRes.json()
          setPatients(data.patients || [])
        }
      } catch (error) {
        console.error('Failed to fetch tasks', error)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [router])

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const highPriorityCount = tasks.filter(t => !t.completed && t.urgency === 'High').length

  const toggleTask = async (task: any) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const next = !task.completed
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks/${task._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: next }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)))
      }
    } catch (e) {
      console.error(e)
    }
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
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const submitNewTask = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/dashboard/doctor/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          urgency: newUrgency,
          time: newTime || '—',
          patientId: newPatientId || undefined,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setTasks((prev) => [created, ...prev])
        setAddOpen(false)
        setNewTitle('')
        setNewTime('')
        setNewPatientId('')
        setNewType('Clinical')
        setNewUrgency('Medium')
      } else {
        alert('Could not create task.')
      }
    } catch {
      alert('Could not create task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">To Do List</h1>
          <p className="text-neutral-400">Manage your daily tasks and priorities.</p>
        </div>
        <Button
          type="button"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-neutral-950 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label className="text-xs text-neutral-400">Title</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task description"
              className="bg-white/5 border-white/10 text-white"
            />
            <label className="text-xs text-neutral-400">Time</label>
            <Input
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="e.g. 2:00 PM"
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="Clinical">Clinical</option>
                  <option value="Admin">Admin</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Urgency</label>
                <select
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Patient (optional)</label>
              <select
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">None</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-500 hover:bg-blue-600"
              disabled={saving || !newTitle.trim()}
              onClick={submitNewTask}
            >
              {saving ? 'Saving…' : 'Create task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black border-white/10 p-6 md:col-span-2">
          <h2 className="text-xl font-bold mb-6">Today&apos;s Tasks</h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-neutral-400">Loading tasks...</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className={`flex items-start justify-between gap-2 p-4 rounded-lg border transition-colors ${
                    task.completed
                      ? 'bg-white/5 border-white/5 opacity-60'
                      : 'bg-[#111] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex gap-4 min-w-0">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-neutral-600 text-blue-500 bg-black cursor-pointer"
                        checked={task.completed}
                        onChange={() => toggleTask(task)}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-semibold ${
                          task.completed ? 'line-through text-neutral-400' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          {task.time}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            task.type === 'Clinical'
                              ? 'bg-blue-500/20 text-blue-400'
                              : task.type === 'Meeting'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-neutral-500/20 text-neutral-300'
                          }`}
                        >
                          {task.type}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            task.urgency === 'High'
                              ? 'text-red-400'
                              : task.urgency === 'Medium'
                                ? 'text-orange-400'
                                : 'text-green-400'
                          }`}
                        >
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {task.urgency}
                        </span>
                      </div>
                      {task.patientId?.name && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Patient: {task.patientId.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="text-neutral-500 hover:text-white transition-colors p-1 shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label="Task actions"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-neutral-950 border-white/10 text-white min-w-[10rem]">
                      <DropdownMenuItem
                        onClick={() => toggleTask(task)}
                        className="focus:bg-white/10"
                      >
                        {task.completed ? 'Mark incomplete' : 'Mark complete'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteTask(task._id)}
                        className="focus:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
            {!loading && tasks.length === 0 && (
              <p className="text-neutral-400 text-sm">No tasks yet. Add one to get started.</p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-black border-white/10 p-6">
            <h3 className="font-bold mb-4">Task Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-400">Completed</span>
                  <span className="text-white">
                    {completedCount}/{totalCount} ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 text-red-400">
                  <span className="font-medium text-sm">High Priority</span>
                  <span className="font-bold">{highPriorityCount}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
