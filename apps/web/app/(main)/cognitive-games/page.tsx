'use client'

import { Card } from "@workspace/ui/components/card"
import { GlassCard } from "@/components/GlassCard"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Brain, Gamepad2, Target, Zap, Play, Trophy, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useRouter } from "next/navigation"
import {
  ALL_COGNITIVE_GAMES,
  filterGamesByPlan,
  type PatientPlan,
  type CognitiveGameItem,
} from "@/lib/activity-catalog"
import { usePatientPlan } from "@/hooks/usePatientPlan"
import { getGameScores } from "./utils/gameScores"
import { API } from '@/lib/api'

const ICONS: Record<string, typeof Brain> = { Brain, Zap, Target, Gamepad2 }

export default function CognitiveGamesPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [totalGames, setTotalGames] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const { plan, loading: planLoading } = usePatientPlan()

  const visibleGames: CognitiveGameItem[] = useMemo(
    () => filterGamesByPlan(ALL_COGNITIVE_GAMES, plan as PatientPlan | null),
    [plan]
  )

  // When plan loads, default selected to first assigned game (or 'all')
  useEffect(() => {
    if (!planLoading && visibleGames.length > 0 && selectedSlug === 'all') {
      // keep 'all' as default — user can pick
    }
  }, [planLoading, visibleGames, selectedSlug])

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/patient`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const cognitiveActs = data.activities?.filter((a: any) => a.type === 'Cognitive') || []
          setActivities(cognitiveActs)
          setTotalGames(cognitiveActs.length * 4 + 17)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  // Build chart data from localStorage per-game scores
  const chartData: Record<string, unknown>[] = useMemo(() => {
    if (selectedSlug === 'all') {
      // Merge all visible games' scores, sorted by date
      const all = visibleGames.flatMap(g =>
        getGameScores(g.slug).map(s => ({
          name: new Date(s.date).toLocaleDateString(),
          score: s.score,
          game: g.name,
          label: s.label,
        }))
      )
      all.sort((a, b) => new Date(a.name as string).getTime() - new Date(b.name as string).getTime())
      return all.slice(-15)
    }
    return getGameScores(selectedSlug)
      .map((s, i) => ({
        name: `#${i + 1}`,
        score: s.score,
        label: s.label,
        date: new Date(s.date).toLocaleDateString(),
      }))
      .slice(-15)
  }, [selectedSlug, visibleGames])

  const selectedGame = visibleGames.find(g => g.slug === selectedSlug)

  // Recent scores: if a game is selected show its scores, else show API activities
  const recentScores = useMemo(() => {
    if (selectedSlug !== 'all') {
      return getGameScores(selectedSlug)
        .slice(-5)
        .reverse()
        .map((s, i) => ({
          _id: i,
          name: selectedGame?.name ?? selectedSlug,
          date: s.date,
          score: `${s.score}%`,
          label: s.label,
        }))
    }
    return activities.slice(0, 5)
  }, [selectedSlug, selectedGame, activities])

  return (
    <div className="space-y-8">
      <div className="relative">
        <Spotlight className="-top-20 left-0" fill="white" />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Cognitive Games</h1>
          <p className="text-neutral-400">Train your brain with challenges assigned by your care team</p>
          {plan?.enabled && (
            <p className="text-sm text-purple-400/90 mt-2">
              Personalized plan active — only games selected by your doctor are shown.
            </p>
          )}
        </div>
      </div>

      {planLoading && (
        <p className="text-neutral-400 text-sm animate-pulse">Loading your cognitive plan…</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {!planLoading && plan?.enabled && visibleGames.length === 0 ? (
            <Card className="bg-black/[0.96] border-white/10 p-8 sm:col-span-2 text-center">
              <p className="text-neutral-300 mb-2">No cognitive games assigned yet.</p>
              <p className="text-sm text-neutral-500">Your doctor will add games to your plan when ready.</p>
            </Card>
          ) : (
            visibleGames.map((game) => {
              const Icon = ICONS[game.iconName] || Brain
              return (
                <Link key={game.slug} href={`/cognitive-games/${game.slug}`} className="block h-full">
                  <GlassCard className="p-6 flex flex-col h-full hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-6 flex-grow">
                      {game.description}
                    </p>
                    
                    <div className="flex flex-col mt-auto">
                      <div className="flex gap-2 mb-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/[0.02] text-white/70">
                          {game.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          game.difficulty === 'Easy' ? 'border-green-500/20 bg-green-500/10 text-green-400' :
                          game.difficulty === 'Medium' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' :
                          'border-red-500/20 bg-red-500/10 text-red-400'
                        } border`}>
                          {game.difficulty}
                        </span>
                      </div>
                      
                      <div className="pt-4 border-t border-white/10">
                        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors text-white/80 hover:text-white">
                          <Play className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                          Play Game
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              )
            })
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Performance chart */}
          <Card className="bg-black/[0.96] border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Performance Trend</h3>

              {/* Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  {selectedSlug === 'all' ? 'All Games' : (selectedGame?.name ?? selectedSlug)}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setSelectedSlug('all'); setDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedSlug === 'all' ? 'text-white bg-white/10' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      All Games
                    </button>
                    {visibleGames.map(g => (
                      <button
                        key={g.slug}
                        onClick={() => { setSelectedSlug(g.slug); setDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          selectedSlug === g.slug ? 'text-white bg-white/10' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-48 w-full">
              {loading ? (
                <p className="text-neutral-500 text-sm">Loading…</p>
              ) : chartData.length === 0 ? (
                <p className="text-neutral-500 text-sm">
                  {selectedSlug === 'all'
                    ? 'Play a game to generate graphs!'
                    : `No scores yet for ${selectedGame?.name ?? selectedSlug}. Play it first!`}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                      formatter={(val: any, _: any, props: any) => [
                        `${val}%${props.payload?.label ? ` (${props.payload.label})` : ''}`,
                        selectedSlug === 'all' ? (props.payload?.game ?? 'Score') : 'Score'
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#a855f7"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#a855f7' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Recent scores */}
          <Card className="bg-black/[0.96] border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">
                {selectedSlug === 'all' ? 'Recent Scores' : `${selectedGame?.name ?? ''} Scores`}
              </h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-neutral-500 text-sm">Loading metrics…</p>
              ) : recentScores.length === 0 ? (
                <p className="text-neutral-500 text-sm">No recent game data available.</p>
              ) : recentScores.map((s: any, index: number) => (
                <div key={s._id ?? index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-sm text-neutral-400">{new Date(s.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">{s.score}</p>
                    {s.label && <p className="text-xs text-neutral-500">{s.label}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-neutral-400 text-sm mb-2">Total Games Played</p>
              <p className="text-3xl font-bold text-white">{loading ? '—' : totalGames}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
