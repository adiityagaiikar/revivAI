'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { API } from '@/lib/api'
import { Save, Ruler, Weight, Cake } from 'lucide-react'

type DemographicsForm = {
  age: string
  weight: string
  height: string
}

const initialForm: DemographicsForm = {
  age: '',
  weight: '',
  height: '',
}

export default function ProfilePage() {
  const [form, setForm] = useState<DemographicsForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const canSubmit = useMemo(() => {
    return !saving && (form.age.trim() !== '' || form.weight.trim() !== '' || form.height.trim() !== '')
  }, [form.age, form.weight, form.height, saving])

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const res = await fetch(`${API}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const fallback = await fetch(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!fallback.ok) return
          const data = await fallback.json()
          if (!cancelled) {
            setForm({
              age: data.age != null ? String(data.age) : '',
              weight: data.weight != null ? String(data.weight) : '',
              height: data.height != null ? String(data.height) : '',
            })
          }
          return
        }

        const data = await res.json()
        if (!cancelled) {
          setForm({
            age: data.age != null ? String(data.age) : '',
            weight: data.weight != null ? String(data.weight) : '',
            height: data.height != null ? String(data.height) : '',
          })
        }
      } catch {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Could not load your profile right now.' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const onChange = (field: keyof DemographicsForm, value: string) => {
    setStatus(null)
    // Keep it numeric-friendly while still allowing decimal values.
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus(null)
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setStatus({ type: 'error', message: 'Please log in again to update profile.' })
        return
      }

      const payload = {
        age: form.age.trim() === '' ? null : Number(form.age),
        weight: form.weight.trim() === '' ? null : Number(form.weight),
        height: form.height.trim() === '' ? null : Number(form.height),
      }

      const res = await fetch(`${API}/user/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setStatus({
          type: 'error',
          message: data?.message || 'Could not save profile. Please check your values.',
        })
        return
      }

      const profile = data?.profile ?? payload
      setForm({
        age: profile.age != null ? String(profile.age) : '',
        weight: profile.weight != null ? String(profile.weight) : '',
        height: profile.height != null ? String(profile.height) : '',
      })
      setStatus({ type: 'success', message: 'Demographics saved successfully.' })
    } catch {
      setStatus({ type: 'error', message: 'Network error while saving profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-[#03060a]">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-white/15 bg-white/4 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/80">Patient Demographics</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Profile Vitals for ANN Predictions</h1>
            <p className="mt-2 text-sm text-white/60">
              Add your age, weight, and height so the model pipeline can personalize analysis for your rehabilitation sessions.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="rounded-2xl border border-white/15 bg-white/3 p-4">
                <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
                  <Cake className="h-4 w-4 text-cyan-300" /> Age
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.age}
                  onChange={(e) => onChange('age', e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/70"
                />
              </label>

              <label className="rounded-2xl border border-white/15 bg-white/3 p-4">
                <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
                  <Weight className="h-4 w-4 text-cyan-300" /> Weight
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.weight}
                  onChange={(e) => onChange('weight', e.target.value)}
                  placeholder="e.g. 70 (kg/lbs)"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/70"
                />
              </label>

              <label className="rounded-2xl border border-white/15 bg-white/3 p-4">
                <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
                  <Ruler className="h-4 w-4 text-cyan-300" /> Height
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.height}
                  onChange={(e) => onChange('height', e.target.value)}
                  placeholder="e.g. 172"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/70"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-white/45">Weight accepts kg or lbs. Height accepts your preferred numeric unit.</p>
              <motion.button
                whileHover={canSubmit ? { scale: 1.04 } : {}}
                whileTap={canSubmit ? { scale: 0.96 } : {}}
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-linear-to-r from-cyan-400/30 to-amber-300/30 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(34,211,238,0.32)] transition hover:shadow-[0_0_36px_rgba(251,191,36,0.32)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Demographics'}
              </motion.button>
            </div>

            {loading && <p className="text-sm text-white/60">Loading your existing profile...</p>}
            {status && (
              <p className={`text-sm ${status.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {status.message}
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}
