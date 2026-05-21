'use client'

import { Dumbbell, Mic, Play, Send, Sparkles } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { useState, useRef, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ElevenLabsVoiceChat } from '@/components/elevenlabs-voice-chat'
import { usePatientPlan, isExerciseAllowed } from '@/hooks/usePatientPlan'

const ELEVENLABS_AGENT_ID = 'agent_5201kndzmwmmew99xsex4237d84t'

const QUICK_WORKOUTS = [
  { slug: 'squats',       id: 'gcNh17Ckjgg', name: 'Perfect Squats Tutorial',   duration: '3 Min', channel: 'Form Guide' },
  { slug: 'lunges',       id: 'D7KaRcUTQeE', name: 'Safe Lunges Tutorial',       duration: '4 Min', channel: 'Form Guide' },
  { slug: 'warrior-pose', id: 'm1zDkYccTJU', name: 'Warrior Pose Foundation',    duration: '5 Min', channel: 'Form Guide' },
]

/* ── Glassmorphism card ── */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`}>
      {children}
    </div>
  )
}

export default function FitnessAssistantPage() {
  const [voiceChatOpen, setVoiceChatOpen]   = useState(false)
  const [activeVideo, setActiveVideo]       = useState<{ id: string; name: string } | null>(null)
  const [inputValue, setInputValue]         = useState('')
  const inputRef                            = useRef<HTMLInputElement>(null)
  const { plan, loading: planLoading }      = usePatientPlan()

  const displayedWorkouts = QUICK_WORKOUTS.filter(w => isExerciseAllowed(w.slug, plan))

  const handleSend = () => {
    if (!inputValue.trim()) return
    // Placeholder — wire to your AI endpoint here
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Fitness Assistant</h1>
        <p className="text-white/40 mt-1 text-sm">AI-powered personal trainer and workout guidance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main assistant card ── */}
        <GlassCard className="lg:col-span-2 p-8 min-h-[520px] flex flex-col">
          {/* Top: avatar + greeting */}
          <div className="flex flex-col items-center justify-center flex-1 gap-5">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"
            >
              <Dumbbell className="h-9 w-9 text-violet-400" />
            </motion.div>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">How can I help you today?</h2>
              <p className="text-white/40 text-sm mt-1.5 max-w-sm">
                Ask about workouts, exercise form, recovery tips, or get a personalised training plan.
              </p>
            </div>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'Best exercises for lower back pain',
                'Create a 7-day plan',
                'How to improve squat form',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setInputValue(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* ── Chat input bar ── */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all duration-200">
            <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your workout..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
            />

            {/* Voice button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => setVoiceChatOpen(true)}
              className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors duration-200"
              style={{ boxShadow: '0 0 12px rgba(139,92,246,0)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 16px rgba(139,92,246,0.35)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 12px rgba(139,92,246,0)'
              }}
              title="Start voice chat"
              type="button"
            >
              <Mic className="h-3.5 w-3.5" />
            </motion.button>

            {/* Send button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors duration-200"
              style={{ boxShadow: '0 0 16px rgba(139,92,246,0.4)' }}
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </GlassCard>

        {/* ── Assigned tutorials ── */}
        <GlassCard className="p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Assigned Tutorials</h3>
            <p className="text-xs text-white/35 mt-0.5">Curated by your doctor</p>
          </div>

          <div className="space-y-2 flex-1">
            {planLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : displayedWorkouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                <Dumbbell className="h-6 w-6 text-white/20" />
                <p className="text-xs text-white/30">No tutorials assigned yet</p>
              </div>
            ) : (
              displayedWorkouts.map((workout) => (
                <motion.div
                  key={workout.id}
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => setActiveVideo({ id: workout.id, name: workout.name })}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{workout.name}</p>
                    <p className="text-xs text-white/35 mt-0.5">
                      {workout.duration} · {workout.channel}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 group-hover:bg-violet-500/20 group-hover:border-violet-500/30 flex items-center justify-center shrink-0 ml-3 transition-colors duration-200">
                    <Play className="h-3 w-3 text-white/50 group-hover:text-violet-400" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Video dialog ── */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="border-white/10 sm:max-w-3xl" style={{ background: '#0a0a0a' }}>
          <DialogHeader>
            <DialogTitle className="text-white">{activeVideo?.name}</DialogTitle>
          </DialogHeader>
          {activeVideo && (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mt-2">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Voice chat ── */}
      <ElevenLabsVoiceChat
        agentId={ELEVENLABS_AGENT_ID}
        active={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
      />
    </div>
  )
}
