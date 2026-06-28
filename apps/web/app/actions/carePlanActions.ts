/**
 * carePlanActions.ts
 *
 * Client-callable wrappers for the care-plan backend endpoints,
 * plus an AI-powered plan generator using Gemini 2.5 Flash.
 *
 * Architecture:
 *   All DB mutations live in the Express backend (/api/care-plan/*).
 *   The Gemini call is proxied through a secure Next.js API route
 *   (/api/ai/generate-care-plan) so the API key NEVER reaches the browser.
 *
 *   revalidatePath equivalents: we dispatch DOM custom events so
 *   any listening component can refresh its data immediately.
 */

import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type TaskType = 'PHYSICAL' | 'COGNITIVE'

export interface CareTask {
  _id?: string
  taskType: TaskType
  taskName: string
  targetValue: number
  assignedDay: string
  isCompleted: boolean
  assignedAt?: string
}

export interface AssignCareTaskResult {
  success: boolean
  task: CareTask
  message: string
}

export interface GenerateCarePlanResult {
  success: boolean
  tasksAdded: number
  tasks: CareTask[]
  message: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getToken(): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) throw new Error('Not authenticated. Please log in.')
  return token
}

/** Dispatch a DOM event so listening components can refresh */
function notifyRefresh(patientId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('careplan:updated', { detail: { patientId } }))
  }
}

/* ─────────────────────────────────────────────
   assignCareTask

   Assigns a single task to a patient's carePlan array.
   Equivalent to: User.findByIdAndUpdate(patientId, { $push: { carePlan: {...} } })
   Revalidates: dispatches 'careplan:updated' (replaces revalidatePath in client context)
───────────────────────────────────────────── */
export async function assignCareTask(
  patientId: string,
  taskType: TaskType,
  taskName: string,
  targetValue: number,
  assignedDay: string,
): Promise<AssignCareTaskResult> {
  const token = getToken()

  if (!patientId) throw new Error('patientId is required.')
  if (!taskName) throw new Error('taskName is required.')
  if (!assignedDay) throw new Error('assignedDay is required.')
  if (targetValue < 1) throw new Error('targetValue must be at least 1.')

  const res = await fetch(`${API}/care-plan/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ patientId, taskType, taskName, targetValue, assignedDay }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to assign task (${res.status})`)

  // Revalidate both doctor and patient views
  notifyRefresh(patientId)

  return data as AssignCareTaskResult
}

/* ─────────────────────────────────────────────
   getCarePlan

   Reads a patient's full care plan.
───────────────────────────────────────────── */
export async function getCarePlan(patientId: string): Promise<CareTask[]> {
  const token = getToken()
  try {
    const res = await fetch(`${API}/care-plan/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.carePlan ?? []
  } catch {
    return []
  }
}

/* ─────────────────────────────────────────────
   markTaskComplete
───────────────────────────────────────────── */
export async function markTaskComplete(
  patientId: string,
  taskId: string,
): Promise<void> {
  const token = getToken()
  await fetch(`${API}/care-plan/${patientId}/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isCompleted: true }),
  })
  notifyRefresh(patientId)
}

/* ─────────────────────────────────────────────
   removeTask
───────────────────────────────────────────── */
export async function removeTask(patientId: string, taskId: string): Promise<void> {
  const token = getToken()
  await fetch(`${API}/care-plan/${patientId}/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  notifyRefresh(patientId)
}

/* ─────────────────────────────────────────────
   generateAndSaveCarePlan

   Uses the secure server-side Gemini proxy (/api/ai/generate-care-plan)
   to convert a doctor's natural-language prompt into a structured
   7-day care plan, then saves it to MongoDB via /api/care-plan/assign-many.

   Flow:
     1. POST /api/ai/generate-care-plan → Next.js server route (key hidden)
     2. Receive parsed CareTask[]
     3. POST /api/care-plan/assign-many → Express backend → MongoDB
     4. Dispatch careplan:updated event to refresh all listening components
───────────────────────────────────────────── */
export async function generateAndSaveCarePlan(
  patientId: string,
  promptText: string,
  replaceExisting = false,
): Promise<GenerateCarePlanResult> {
  const token = getToken()

  if (!patientId) throw new Error('patientId is required.')
  if (!promptText) throw new Error('promptText is required.')

  /* ── 1. Call the secure server-side Gemini proxy ── */
  const aiRes = await fetch('/api/ai/generate-care-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptText }),
  })

  const aiData = await aiRes.json()
  if (!aiRes.ok) throw new Error(aiData.error || 'AI generation failed.')

  let parsedTasks: CareTask[] = aiData.tasks
  if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
    throw new Error('AI returned an empty plan. Please try rephrasing your prompt.')
  }

  // Enforce isCompleted: false regardless of what the model returns
  parsedTasks = parsedTasks.map((t) => ({ ...t, isCompleted: false }))

  /* ── 2. Save to MongoDB via Express backend ── */
  const saveRes = await fetch(`${API}/care-plan/assign-many`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ patientId, tasks: parsedTasks, replaceExisting }),
  })

  const saveData = await saveRes.json()
  if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save care plan.')

  /* ── 3. Revalidate both portals ── */
  notifyRefresh(patientId)

  return {
    success: true,
    tasksAdded: saveData.tasksAdded,
    tasks: parsedTasks,
    message: saveData.message,
  }
}
