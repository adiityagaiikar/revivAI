'use client'

import {
  Activity, Bot, Dumbbell, Loader2, Mic, Send, Sparkles, CheckCircle2, Clock,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ElevenLabsVoiceChat } from '@/components/elevenlabs-voice-chat'
import { usePatientPlan } from '@/hooks/usePatientPlan'

const ELEVENLABS_AGENT_ID = 'agent_5201kndzmwmmew99xsex4237d84t'

const SUGGESTION_CHIPS = [
  'Best exercises for lower back pain',
  'Create a 7-day plan',
  'How to improve squat form',
]

/* ── Types ── */
interface ChatMsg {
  role: 'user' | 'model'
  text: string
}

/* ── Glassmorphism card ── */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md ${className}`}>
      {children}
    </div>
  )
}

/* ── Animated message bubble ── */
function MessageBubble({ msg, idx }: { msg: ChatMsg; idx: number }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      key={idx}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.05 }}
      className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0 mb-0.5">
          You
        </div>
      ) : (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'rounded-br-sm bg-gradient-to-br from-violet-600 to-violet-700 text-white'
            : 'rounded-bl-sm bg-white/8 border border-white/10 text-white/85'
        }`}
      >
        {msg.text}
      </div>
    </motion.div>
  )
}

/* ── Thinking indicator ── */
function ThinkingDots() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/10">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FitnessAssistantPage() {
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [activeVideo, setActiveVideo]     = useState<{ id: string; name: string } | null>(null)
  const [inputValue, setInputValue]       = useState('')
  const [messages, setMessages]           = useState<ChatMsg[]>([])
  const [thinking, setThinking]           = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const { plan, loading: planLoading } = usePatientPlan()

  // Deduplicate physicalTasks: group by taskName, merge all assigned days
  const rawTasks: any[] = (plan as any)?.careTasks?.filter(
    (t: any) => t.taskType === 'PHYSICAL'
  ) ?? []
  // Build a map: taskName -> { task, days[] }
  const taskMap = new Map<string, { task: any; days: string[]; targetValue: number }>()
  rawTasks.forEach((t: any) => {
    const key = t.taskName.toLowerCase()
    if (taskMap.has(key)) {
      taskMap.get(key)!.days.push(t.assignedDay)
    } else {
      taskMap.set(key, { task: t, days: [t.assignedDay], targetValue: t.targetValue })
    }
  })
  const physicalTasks = Array.from(taskMap.values()).map(({ task, days, targetValue }) => ({
    ...task,
    assignedDay: days.length > 1 ? `${days.length} days` : days[0],
    targetValue,
  }))


  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const userMsg: ChatMsg = { role: 'user', text: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInputValue('')
    setThinking(true)
    inputRef.current?.focus()

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      const reply = data.text ?? 'Sorry, something went wrong. Please try again.'
      setMessages((prev) => [...prev, { role: 'model', text: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Connection error — please check your internet and try again.' },
      ])
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) sendMessage(inputValue)
  }

  const hasChat = messages.length > 0

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Fitness Assistant</h1>
        <p className="text-white/40 mt-1 text-sm">AI-powered personal trainer and workout guidance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main assistant card ── */}
        <GlassCard className="lg:col-span-2 flex flex-col min-h-[520px]">

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
            {!hasChat ? (
              /* Welcome state */
              <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-2xl border border-violet-500/20 bg-violet-500/10 flex items-center justify-center"
                  style={{ boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}
                >
                  <Dumbbell className="h-9 w-9 text-violet-400" />
                </motion.div>

                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white">How can I help you today?</h2>
                  <p className="text-white/40 text-sm mt-1.5 max-w-sm">
                    Ask about workouts, exercise form, recovery tips, or get a personalised training plan.
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-violet-500/30 transition-all duration-200"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat history */
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <MessageBubble key={idx} msg={msg} idx={idx} />
                  ))}
                  {thinking && (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <ThinkingDots />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* ── Input bar ── */}
          <div className="px-4 pb-4 pt-2 border-t border-white/8 shrink-0">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all duration-200">
              <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />

              <input
                ref={inputRef}
                id="fitness-ai-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={thinking}
                placeholder="Ask me anything about your workout..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none disabled:opacity-50"
              />

              {/* Voice button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => setVoiceChatOpen(true)}
                className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors duration-200"
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
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || thinking}
                id="fitness-ai-send"
                className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors duration-200"
                style={{ boxShadow: '0 0 16px rgba(139,92,246,0.4)' }}
                type="button"
              >
                {thinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </motion.button>
            </div>
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
            ) : physicalTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                <Dumbbell className="h-6 w-6 text-white/20" />
                <p className="text-xs text-white/30">No physical tutorials assigned yet</p>
                <p className="text-[10px] text-white/20">Your doctor hasn&apos;t prescribed any yet</p>
              </div>
            ) : (
              physicalTasks.map((task: any, idx: number) => (
                <motion.div
                  key={task._id ?? idx}
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-colors group"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{task.taskName}</p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {task.assignedDay} &middot; {task.targetValue} reps
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-white/25" />
                    )}
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
