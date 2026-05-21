'use client'

import { Clock, Flame, Play, Search, Zap, ImageOff } from 'lucide-react'
import { Input } from '@workspace/ui/components/input'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ALL_EXERCISES, filterExercisesByPlan, type PatientPlan, type ExerciseItem } from '@/lib/activity-catalog'
import { usePatientPlan } from '@/hooks/usePatientPlan'

/* ─────────────────────────────────────────────
   Category → accent colour mapping
───────────────────────────────────────────── */
const CATEGORY_ACCENT: Record<string, { text: string; bg: string; border: string }> = {
  Strength:    { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  Cardio:      { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  Core:        { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  Flexibility: { text: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Beginner:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Intermediate: 'bg-amber-500/15   text-amber-400   border-amber-500/25',
  Advanced:     'bg-red-500/15     text-red-400     border-red-500/25',
  'All Levels': 'bg-cyan-500/15    text-cyan-400    border-cyan-500/25',
}

const CATEGORIES = ['All', 'Strength', 'Cardio', 'Core', 'Flexibility']

/* ─────────────────────────────────────────────
   Stagger animation variants
───────────────────────────────────────────── */
const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: i * 0.05 },
  }),
}

/* ─────────────────────────────────────────────
   GIF image with graceful fallback
───────────────────────────────────────────── */
function ExerciseGif({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/2">
        <ImageOff className="h-8 w-8 text-white/15" />
        <span className="text-[10px] text-white/20 font-medium tracking-wide">GIF coming soon</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
    />
  )
}

/* ─────────────────────────────────────────────
   Single exercise card
───────────────────────────────────────────── */
function ExerciseCard({ exercise, index }: { exercise: ExerciseItem; index: number }) {
  const accent = CATEGORY_ACCENT[exercise.category] ?? CATEGORY_ACCENT.Strength
  const diffStyle = DIFFICULTY_STYLE[exercise.difficulty] ?? DIFFICULTY_STYLE.Beginner

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-white/2 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/4 hover:border-white/20 transition-colors duration-300 flex flex-col group"
    >
      {/* ── GIF preview ── */}
      <div className="w-full relative overflow-hidden bg-black/50 aspect-video">
        <ExerciseGif src={exercise.gifUrl} alt={`${exercise.name} demonstration`} />

        {/* Floating badges — top-right of GIF */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 z-10">
          {exercise.hasAI && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan-500/30 bg-black/60 backdrop-blur-md text-[10px] font-bold text-cyan-400 tracking-wide">
              <Zap className="h-2.5 w-2.5" />
              AI
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-md bg-black/60 ${diffStyle}`}>
            {exercise.difficulty}
          </span>
        </div>

        {/* Category chip — bottom-left of GIF */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-md bg-black/60 ${accent.text} ${accent.border}`}>
            {exercise.category}
          </span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Name + description */}
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{exercise.name}</h3>
          <p className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-2">{exercise.description}</p>
        </div>

        {/* Muscle groups */}
        <div className="flex flex-wrap gap-1.5">
          {exercise.muscleGroups.map((m) => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35">
              {m}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-white/35 mt-auto">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{exercise.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span>{exercise.calories} kcal</span>
          </div>
        </div>

        {/* CTA button — always visible */}
        {exercise.hasAI ? (
          <Link href={`/exercises/${exercise.slug}`} className="block mt-1">
            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 backdrop-blur-md flex items-center justify-center gap-2 transition-all duration-300 hover:bg-white/10 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-sm font-medium">
              <Play className="h-4 w-4" />
              Start with AI
            </button>
          </Link>
        ) : (
          <div className="w-full py-3 mt-1 rounded-xl bg-white/2 border border-white/8 text-white/25 flex items-center justify-center gap-2 text-sm cursor-not-allowed">
            In-person / guided only
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton card (loading state)
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white/2 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* GIF area */}
      <div className="w-full aspect-video bg-white/5 animate-pulse" />
      {/* Body */}
      <div className="p-5 flex flex-col gap-3">
        <div className="h-4 w-3/4 rounded-lg bg-white/8 animate-pulse" />
        <div className="h-3 w-full rounded-lg bg-white/5 animate-pulse" />
        <div className="h-3 w-2/3 rounded-lg bg-white/5 animate-pulse" />
        <div className="flex gap-1.5 mt-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-4 w-14 rounded-full bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full rounded-xl bg-white/5 border border-white/8 animate-pulse mt-2" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function ExercisesPage() {
  const [searchTerm, setSearchTerm]           = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { plan, loading: planLoading }        = usePatientPlan()

  const visibleExercises = useMemo(
    () => filterExercisesByPlan(ALL_EXERCISES, plan as PatientPlan | null),
    [plan]
  )

  const filteredExercises = useMemo(
    () =>
      visibleExercises.filter((ex) => {
        const matchesSearch   = ex.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory
        return matchesSearch && matchesCategory
      }),
    [visibleExercises, searchTerm, selectedCategory]
  )

  return (
    <div className="space-y-8" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Exercises</h1>
        <p className="text-white/40 mt-1 text-sm">
          {plan?.enabled
            ? 'Showing exercises assigned by your care team'
            : 'Browse the full exercise library with AI-powered tracking'}
        </p>
      </div>

      {/* ── Search + category filters ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
          <Input
            placeholder="Search exercises…"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20 rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selectedCategory === cat
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exercise grid ── */}
      {planLoading ? (
        /* Skeleton grid while plan loads */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !planLoading && plan?.enabled && filteredExercises.length === 0 ? (
        /* Empty state — doctor plan active but nothing assigned */
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-12 text-center">
          <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Search className="h-6 w-6 text-white/25" />
          </div>
          <p className="text-white/60 font-medium mb-1">No exercises assigned yet</p>
          <p className="text-sm text-white/30">Your doctor will assign exercises to your plan. Check back later.</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        /* Empty state — search returned nothing */
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-12 text-center">
          <p className="text-white/60 font-medium mb-1">No exercises match &ldquo;{searchTerm}&rdquo;</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('All') }}
            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredExercises.map((exercise, i) => (
            <ExerciseCard key={exercise.slug} exercise={exercise} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
