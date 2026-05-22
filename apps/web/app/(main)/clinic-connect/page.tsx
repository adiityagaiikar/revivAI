'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Video, PhoneCall, CalendarDays, Send } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

/* ── Types ── */
interface Message {
  id: number
  sender: 'Dr. Viren' | 'You'
  text: string
  time: string
}

/* ── Simulated doctor responses ── */
const DOCTOR_REPLIES = [
  "I see. Let's adjust your depth targets for the squats today.",
  "That's good progress. Keep your knee angle below 90° for now.",
  "Make sure you're doing the warm-up stretches before each session.",
  "Your range-of-motion data looks promising this week. Keep it up.",
  "If the discomfort persists, reduce the rep count by half and let me know.",
]

let replyIndex = 0
function nextReply(): string {
  const reply = DOCTOR_REPLIES[replyIndex % DOCTOR_REPLIES.length]
  replyIndex++
  return reply
}

function getTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/* ── Channel cards (kept below the chat) ── */
const CHANNELS = [
  {
    icon: Video,
    label: 'Video Consultation',
    description: 'Schedule a live video session with your assigned physiotherapist.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  },
  {
    icon: PhoneCall,
    label: 'Request Callback',
    description: 'Schedule a phone callback from a clinic coordinator within 24 hours.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  },
  {
    icon: CalendarDays,
    label: 'In-Clinic Appointment',
    description: 'Book an in-person slot at your nearest registered clinic location.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'Coming Soon',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
]

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[75%]">
      {/* Avatar */}
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
        V
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/10">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function ClinicConnectPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'Dr. Viren',
      text: 'Hello, how is your knee feeling today?',
      time: '09:00 AM',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return

    /* Append user message */
    const userMsg: Message = {
      id: Date.now(),
      sender: 'You',
      text,
      time: getTime(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    /* Simulate doctor typing then responding */
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const doctorMsg: Message = {
        id: Date.now() + 1,
        sender: 'Dr. Viren',
        text: nextReply(),
        time: getTime(),
      }
      setMessages((prev) => [...prev, doctorMsg])
    }, 1500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clinic Connect</h1>
          <p className="text-white/60 mt-1">Secure, real-time communication with your clinical care team.</p>
        </div>
      </div>

      {/* ── Chat window ── */}
      <GlassCard glow className="flex flex-col" style={{ height: '520px' }}>

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white">
              V
            </div>
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Dr. Viren</p>
            <p className="text-[11px] text-emerald-400">Online · Assigned Physiotherapist</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((msg) => {
            const isDoctor = msg.sender === 'Dr. Viren'
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isDoctor ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                {isDoctor ? (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
                    V
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70 shrink-0 mb-1">
                    Y
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[70%] ${isDoctor ? '' : 'items-end'} flex flex-col gap-1`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isDoctor
                        ? 'rounded-bl-sm bg-white/8 border border-white/10 text-white/85'
                        : 'rounded-br-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-white/25 px-1">{msg.time}</span>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-4 py-3 border-t border-white/8 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to Dr. Viren…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/8 disabled:text-white/20 text-white transition-colors shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </GlassCard>

      {/* ── Other channels ── */}
      <div>
        <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3 px-1">Other Channels</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <GlassCard key={ch.label} className="p-5 flex items-start gap-4 opacity-60 pointer-events-none">
                <div className={`p-2.5 rounded-xl border ${ch.bg} ${ch.border} shrink-0`}>
                  <Icon className={`w-5 h-5 ${ch.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{ch.label}</p>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${ch.badgeColor}`}>
                      {ch.badge}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{ch.description}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>

    </div>
  )
}
