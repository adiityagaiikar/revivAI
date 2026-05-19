'use client'

import { Card } from "@workspace/ui/components/card"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Activity, Clock, Flame, Play, Search } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ALL_EXERCISES, filterExercisesByPlan, type PatientPlan } from "@/lib/activity-catalog"
import { usePatientPlan } from "@/hooks/usePatientPlan"

export default function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { plan, loading: planLoading } = usePatientPlan()

  const categories = ['All', 'Strength', 'Cardio', 'Core', 'Flexibility']

  const visibleExercises = useMemo(() => {
    return filterExercisesByPlan(ALL_EXERCISES, plan as PatientPlan | null)
  }, [plan])

  const filteredExercises = visibleExercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || exercise.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8">
      <div className="relative">
        <Spotlight
          className="-top-20 left-0"
          fill="white"
        />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Exercises</h1>
          <p className="text-neutral-400">Browse exercises assigned to you by your care team</p>
          {plan?.enabled && (
            <p className="text-sm text-blue-400/90 mt-2">
              Personalized plan active — only exercises selected by your doctor are shown.
            </p>
          )}
        </div>
      </div>

      {planLoading && (
        <p className="text-neutral-400 text-sm animate-pulse">Loading your exercise plan…</p>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      {!planLoading && plan?.enabled && filteredExercises.length === 0 ? (
        <Card className="bg-black/[0.96] border-white/10 p-8 text-center">
          <p className="text-neutral-300 mb-2">No exercises assigned yet.</p>
          <p className="text-sm text-neutral-500">Your doctor will choose exercises for your plan. Check back later.</p>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredExercises.map((exercise) => {
          const ExerciseCard = (
            <Card 
              key={exercise.slug}
              className="bg-black/[0.96] border-white/10 p-6 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white/5 ${
                  exercise.category === 'Strength' ? 'text-blue-400' :
                  exercise.category === 'Cardio' ? 'text-orange-400' :
                  exercise.category === 'Core' ? 'text-purple-400' :
                  'text-green-400'
                }`}>
                  <Activity className="h-6 w-6" />
                </div>
                <div className="flex gap-2">
                  {exercise.hasAI && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                      AI
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    exercise.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                    exercise.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    exercise.difficulty === 'All Levels' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-1">{exercise.name}</h3>
              <p className="text-sm text-neutral-400 mb-4">{exercise.category}</p>
              
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{exercise.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4" />
                  <span>{exercise.calories} cal</span>
                </div>
              </div>

              {exercise.hasAI && exercise.slug ? (
                <Link href={`/exercises/${exercise.slug}`} className="block">
                  <span className="w-full mt-4 flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors opacity-0 group-hover:opacity-100">
                    <Play className="h-4 w-4" />
                    Start with AI
                  </span>
                </Link>
              ) : (
                <div className="w-full mt-4 flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 text-neutral-500 text-sm">
                  In-person / guided only
                </div>
              )}
            </Card>
          )

          return ExerciseCard
        })}
      </div>
      )}
    </div>
  )
}
