'use client'

/**
 * app/(main)/onboarding/page.tsx
 *
 * Clinical Onboarding — Patient's first-login flow.
 * Matches the patient to a doctor via the autoAssignDoctor Server Action.
 *
 * Design: Antigravity UI — dark mode, glassmorphism, neon cyan / purple.
 * Animations: Framer Motion v12 (no gradient animation — uses class switching).
 * Auth: useAuth() hook (no redundant /users/me fetch needed).
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Loader2, CheckCircle2, ChevronRight,
  Brain, Activity, Heart, Bone, Dumbbell, Sparkles,
  ArrowRight, Shield, Clock, Users,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { autoAssignDoctor } from '@/app/actions/triageActions'

/* ─────────────────────────────────────────────
   Symptom catalog
───────────────────────────────────────────── */
const ISSUE_GROUPS = [
  {
    category: 'Post-Surgical',
    icon: Shield,
    accentClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500',
    issues: ['Post-Op Recovery', 'Post-Surgical Rehabilitation', 'Wound Care'],
  },
  {
    category: 'Orthopaedic',
    icon: Bone,
    accentClass: 'text-violet-400',
    bgClass: 'bg-violet-500',
    issues: ['Knee Pain', 'Mobility Issues', 'Hip Pain', 'Shoulder Mobility', 'ACL Reconstruction'],
  },
  {
    category: 'Neurological',
    icon: Brain,
    accentClass: 'text-amber-400',
    bgClass: 'bg-amber-500',
    issues: ['Cognitive Fog', 'Memory Fog', 'Focus Issues', 'Stroke Rehabilitation'],
  },
  {
    category: 'Spine & Back',
    icon: Activity,
    accentClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    issues: ['Lower Back Pain', 'Sciatica', 'Neck Stiffness', 'Lumbar Disc Herniation'],
  },
  {
    category: 'Cardio & Respiratory',
    icon: Heart,
    accentClass: 'text-red-400',
    bgClass: 'bg-red-500',
    issues: ['Cardiac Rehabilitation', 'Breathlessness', 'COPD Management'],
  },
  {
    category: 'General',
    icon: Dumbbell,
    accentClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
    issues: ['Muscle Weakness', 'Balance & Fall Prevention', 'Sports Injury', 'Chronic Pain Management'],
  },
]

/* ─────────────────────────────────────────────
   Animation variants
───────────────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.22, ease: 'easeIn' as const },
  },
}

const groupVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24, delay: i * 0.05 },
  }),
}

/* ─────────────────────────────────────────────
   Confetti burst
───────────────────────────────────────────── */
function ConfettiBurst() {
  const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#fff']
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: `${(i * 2.5) % 100}%`,
    delay: `${(i * 0.017) % 0.7}s`,
    size: `${5 + (i % 9)}px`,
    rotation: `${(i * 9) % 360}deg`,
    duration: `${0.7 + (i % 8) * 0.1}s`,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-bounce"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 2 === 0 ? '50%' : '3px',
            transform: `rotate(${p.rotation})`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Stepper  (width-only animation, no gradient animation)
───────────────────────────────────────────── */
function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === step ? 28 : i < step ? 20 : 8 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className={`h-1.5 rounded-full ${
            i <= step
              ? 'bg-gradient-to-r from-cyan-500 to-violet-500'
              : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Issue toggle pill
───────────────────────────────────────────── */
function IssuePill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border
        text-sm font-medium transition-colors duration-150 text-left
        ${selected
          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_14px_rgba(6,182,212,0.22)]'
          : 'bg-white/[0.025] border-white/10 text-white/50 hover:text-white hover:border-white/22 hover:bg-white/[0.05]'
        }`}
    >
      <AnimatePresence mode="wait">
        {selected && (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="shrink-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [step, setStep]                       = useState(0)
  const [selectedIssues, setSelectedIssues]   = useState<string[]>([])
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [assignedDoctor, setAssignedDoctor]   = useState<string | null>(null)
  const [matchInfo, setMatchInfo]             = useState<string | null>(null)
  const [showConfetti, setShowConfetti]       = useState(false)

  const patientId = user?.id ?? null

  /* ── Toggle issue selection ── */
  const toggle = useCallback((issue: string) => {
    setError(null)
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue],
    )
  }, [])

  /* ── Fire the Server Action ── */
  const handleFindCareTeam = useCallback(async () => {
    if (!patientId) {
      setError('Session expired. Please log out and log back in.')
      return
    }
    if (selectedIssues.length === 0) {
      setError('Select at least one issue to continue.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await autoAssignDoctor(patientId, selectedIssues)
      setAssignedDoctor(result.doctorName)
      setMatchInfo(result.message)
      setShowConfetti(true)
      setStep(2)
      setTimeout(() => router.push('/dashboard'), 2800)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [patientId, selectedIssues, router])

  /* ── Auth loading guard ── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-white/30 text-sm">Verifying your session…</p>
        </div>
      </div>
    )
  }

  /* ────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4">
      {/* Confetti */}
      {showConfetti && <ConfettiBurst />}

      <div className="relative z-10 w-full max-w-xl">

        {/* ── Glass Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8"
          style={{
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.55)',
          }}
        >
          {/* Stepper header */}
          <div className="flex items-center justify-between mb-8">
            <Stepper step={step} total={3} />
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
              Step {step + 1} of 3
            </span>
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════════════════════
                STEP 0 — Welcome
            ══════════════════════════════ */}
            {step === 0 && (
              <motion.div
                key="welcome"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6 text-center"
              >
                {/* Icon */}
                <div className="relative inline-flex mx-auto">
                  <div
                    className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                    style={{ background: 'rgba(6,182,212,0.3)' }}
                  />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-cyan-400" />
                  </div>
                </div>

                {/* Copy */}
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    Personalise Your Recovery
                  </h1>
                  <p className="text-white/45 mt-3 leading-relaxed text-sm">
                    {user?.name ? `Hi ${user.name.split(' ')[0]}! ` : ''}
                    Tell us what you&apos;re dealing with and our AI triage engine
                    will match you to the right specialist in seconds.
                  </p>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Zap,    label: 'AI Matching',  sub: 'Specialty-aware' },
                    { icon: Clock,  label: 'Instant',      sub: 'No waiting room' },
                    { icon: Users,  label: 'Load Balanced',sub: 'Fair distribution' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center space-y-1"
                    >
                      <Icon className="h-4 w-4 text-cyan-400 mx-auto" />
                      <p className="text-xs font-semibold text-white/80">{label}</p>
                      <p className="text-[10px] text-white/30">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <motion.button
                  type="button"
                  id="onboarding-get-started"
                  onClick={() => setStep(1)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                    bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold text-sm
                    shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:shadow-[0_0_36px_rgba(6,182,212,0.5)]
                    transition-shadow duration-300"
                >
                  Get Started <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {/* ══════════════════════════════
                STEP 1 — Issue Selection
            ══════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="issues"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-5"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    What are you experiencing?
                  </h2>
                  <p className="text-white/40 text-sm mt-1">
                    Select all that apply — your answers power the AI matching.
                  </p>
                </div>

                {/* Scrollable issue groups */}
                <div
                  className="space-y-4 max-h-[400px] overflow-y-auto pr-1 -mr-1"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                  }}
                >
                  {ISSUE_GROUPS.map((group, gi) => {
                    const GroupIcon = group.icon
                    return (
                      <motion.div
                        key={group.category}
                        custom={gi}
                        variants={groupVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`h-5 w-5 rounded-md ${group.bgClass}/20 border border-white/10 flex items-center justify-center shrink-0`}
                          >
                            <GroupIcon className={`h-3 w-3 ${group.accentClass}`} />
                          </div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${group.accentClass} opacity-60`}>
                            {group.category}
                          </p>
                        </div>

                        {/* Pills */}
                        <div className="flex flex-wrap gap-2">
                          {group.issues.map((issue) => (
                            <IssuePill
                              key={issue}
                              label={issue}
                              selected={selectedIssues.includes(issue)}
                              onClick={() => toggle(issue)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Selection summary */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <span className="text-xs text-white/30">
                    {selectedIssues.length === 0
                      ? 'Select at least one issue to continue'
                      : `${selectedIssues.length} issue${selectedIssues.length !== 1 ? 's' : ''} selected`}
                  </span>
                  {selectedIssues.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                      {selectedIssues.slice(0, 3).map((i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-400"
                        >
                          {i}
                        </span>
                      ))}
                      {selectedIssues.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                          +{selectedIssues.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm overflow-hidden"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Find My Care Team */}
                <motion.button
                  type="button"
                  id="find-care-team-btn"
                  onClick={handleFindCareTeam}
                  disabled={selectedIssues.length === 0 || loading || !patientId}
                  whileHover={{ scale: selectedIssues.length > 0 && !loading ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                    bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold text-sm
                    shadow-[0_0_24px_rgba(6,182,212,0.35)]
                    hover:shadow-[0_0_36px_rgba(6,182,212,0.5)]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-shadow duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analysing symptoms &amp; matching specialists…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Find My Care Team
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* ══════════════════════════════
                STEP 2 — Success
            ══════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="success"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center space-y-6"
              >
                {/* Animated check icon */}
                <div className="relative inline-flex mx-auto">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                    className="relative"
                  >
                    <div
                      className="absolute inset-0 rounded-full blur-2xl"
                      style={{ background: 'rgba(16,185,129,0.28)' }}
                    />
                    <div className="relative h-24 w-24 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                  </motion.div>
                </div>

                {/* Copy */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    You&apos;re all set! 🎉
                  </h2>
                  {assignedDoctor && (
                    <p className="text-white/60 mt-2 text-sm">
                      Matched with{' '}
                      <span className="text-cyan-400 font-semibold">{assignedDoctor}</span>
                    </p>
                  )}
                  {matchInfo && (
                    <p className="text-white/30 text-xs mt-1">{matchInfo}</p>
                  )}
                  <p className="text-white/25 text-xs mt-2">
                    Redirecting to your personalised dashboard…
                  </p>
                </motion.div>

                {/* Selected issues */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {selectedIssues.map((issue) => (
                    <span
                      key={issue}
                      className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 font-medium"
                    >
                      {issue}
                    </span>
                  ))}
                </motion.div>

                {/* Redirect progress bar */}
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.8, ease: 'linear' }}
                  />
                </div>

                <motion.button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Go to dashboard now <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Skip link */}
        <AnimatePresence>
          {step < 2 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center mt-4"
            >
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-xs text-white/20 hover:text-white/50 transition-colors"
              >
                Skip for now → go to dashboard
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
