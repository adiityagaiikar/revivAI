'use client'

import { useState, useEffect } from 'react'
import type { PatientPlan } from '@/lib/activity-catalog'

import { API } from '@/lib/api'

export function usePatientPlan() {
  const [plan, setPlan] = useState<PatientPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }
        const res = await fetch(`${API}/dashboard/patient`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const p = data.plan
        if (p) {
          setPlan({
            enabled: !!p.enabled,
            exerciseSlugs: p.exerciseSlugs || [],
            gameSlugs: p.gameSlugs || [],
          })
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { plan, loading }
}

export function isExerciseAllowed(exerciseId: string, plan: PatientPlan | null): boolean {
  if (!plan?.enabled) return true
  return plan.exerciseSlugs.includes(exerciseId)
}

export function isGameAllowed(gameSlug: string, plan: PatientPlan | null): boolean {
  if (!plan?.enabled) return true
  return plan.gameSlugs.includes(gameSlug)
}
