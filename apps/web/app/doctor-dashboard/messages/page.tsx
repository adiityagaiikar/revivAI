'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Send, Video, Search,
  Loader2, CheckCheck, Clock,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { API } from '@/lib/api'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Patient {
  _id: string
  name: string
  email: string
  condition?: string
  complianceScore?: number | null
}

interface ChatMessage {
  id: string
  sender: 'doctor' | 'patient'
  text: string
  time: string
  read: boolean
}

interface Conversation {
  patientId: string
  messages: ChatMessage[]
}

/* ─────────────────────────────────────────────
   Seed dummy chat history per patient
───────────────────────────────────────────── */
const DOCTOR_REPLIES = [
  "I've reviewed your latest session data. Your form scores are improving — keep it up.",
  "Please make sure you're completing the warm-up stretches before each exercise.",
  "I've adjusted your plan. You'll see updated exercises in your app now.",
  "Your range-of-motion data looks promising this week. Let's push a bit further.",
  "If the discomfort persists after today's session, reduce reps by half and message me.",
]

const PATIENT_OPENERS = [
  "Hi Doctor, my knee felt a bit stiff during today's squats.",
  "Hello, I completed all my exercises today. Feeling good!",
  "Doctor, I had some pain during the lunges. Should I stop?",
  "Hi, just checking in. My compliance score dropped — is that normal?",
  "Good morning! Ready for today's session. Any new instructions?",
]

function seedConversation(patient: Patient, index: number): ChatMessage[] {
  const opener  = PATIENT_OPENERS[index % PATIENT_OPENERS.length]
  const reply   = DOCTOR_REPLIES[index % DOCTOR_REPLIES.length]
  const now     = new Date()
  const t = (offsetMin: number) =>
    new Date(now.getTime() - offsetMin * 60000).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })
  return [
    { id: `${patient._id}-1`, sender: 'patient', text: opener,  time: t(47), read: true },
    { id: `${patient._id}-2`, sender: 'doctor',  text: reply,   time: t(40), read: true },
    { id: `${patient._id}-3`, sender: 'patient', text: "Thank you, Doctor. I'll follow your advice.", time: t(38), read: true },
    { id: `${patient._id}-4`, sender: 'doctor',  text: "Great. Keep logging your sessions and I'll check in tomorrow.", time: t(30), read: true },
  ]
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function getTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function latestMessage(msgs: ChatMessage[]): string {
  if (!msgs.length) return 'No messages yet'
  const last = msgs[msgs.length - 1]
  const prefix = last.sender === 'doctor' ? 'You: ' : ''
  return prefix + (last.text.length > 42 ? last.text.slice(0, 42) + '…' : last.text)
}

/* ─────────────────────────────────────────────
   Typing indicator
───────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[70%]">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500/40 to-cyan-500/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
        P
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/10">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Custom tooltip for recharts (unused here but
   keeping import clean)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Left pane — inbox list item
───────────────────────────────────────────── */
function InboxItem({
  patient,
  messages,
  isActive,
  unread,
  onClick,
}: {
  patient: Patient
  messages: ChatMessage[]
  isActive: boolean
  unread: number
  onClick: () => void
}) {
  const last = messages[messages.length - 1]
  const preview = latestMessage(messages)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 border-l-2 ${
        isActive
          ? 'bg-cyan-500/10 border-l-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]'
          : 'border-l-transparent hover:bg-white/[0.03] hover:border-l-white/20'
      }`}
    >
      {/* Avatar */}
      <div className={`relative h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
        isActive
          ? 'bg-gradient-to-br from-cyan-500/50 to-violet-500/50 border border-cyan-500/40 text-white'
          : 'bg-white/8 border border-white/10 text-white/60'
      }`}>
        {patient.name.charAt(0)}
        {/* Online dot */}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#050505]" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
            {patient.name}
          </p>
          {last && (
            <span className="text-[10px] text-white/25 shrink-0">{last.time}</span>
          )}
        </div>
        <p className="text-xs text-white/35 truncate mt-0.5">{preview}</p>
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <span className="h-5 w-5 rounded-full bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread}
        </span>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────
   Right pane — chat bubble
───────────────────────────────────────────── */
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isDoctor = msg.sender === 'doctor'
  return (
    <div className={`flex items-end gap-2 ${isDoctor ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-1 ${
        isDoctor
          ? 'bg-gradient-to-br from-cyan-500/50 to-violet-500/50 border border-cyan-500/30 text-white'
          : 'bg-white/8 border border-white/10 text-white/60'
      }`}>
        {isDoctor ? 'Dr' : 'P'}
      </div>

      {/* Bubble + time */}
      <div className={`max-w-[68%] flex flex-col gap-1 ${isDoctor ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isDoctor
            ? 'rounded-br-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white'
            : 'rounded-bl-sm bg-white/8 border border-white/10 text-white/85'
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 px-1 ${isDoctor ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-white/25">{msg.time}</span>
          {isDoctor && (
            <CheckCheck className="h-3 w-3 text-cyan-400/60" />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function MessagesPage() {
  const [patients, setPatients]           = useState<Patient[]>([])
  const [loading, setLoading]             = useState(true)
  const [searchQuery, setSearchQuery]     = useState('')
  const [activeId, setActiveId]           = useState<string | null>(null)
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({})
  const [input, setInput]                 = useState('')
  const [isTyping, setIsTyping]           = useState(false)
  const [unreadCounts, setUnreadCounts]   = useState<Record<string, number>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const router    = useRouter()

  /* ── Fetch patients from triage endpoint ── */
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      try {
        const res = await fetch(`${API}/dashboard/doctor/triage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data: Patient[] = await res.json()
          setPatients(data)

          // Seed a conversation for each patient
          const convos: Record<string, ChatMessage[]> = {}
          const unreads: Record<string, number> = {}
          data.forEach((p, i) => {
            convos[p._id]  = seedConversation(p, i)
            unreads[p._id] = i === 0 ? 0 : 1   // first patient already "read"
          })
          setConversations(convos)
          setUnreadCounts(unreads)

          // Auto-select first patient
          if (data.length > 0) setActiveId(data[0]._id)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [router])

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, activeId, isTyping])

  /* ── Mark as read when switching to a conversation ── */
  const selectPatient = useCallback((id: string) => {
    setActiveId(id)
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }))
  }, [])

  /* ── Send message ── */
  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !activeId) return

    const doctorMsg: ChatMessage = {
      id:     `${activeId}-${Date.now()}`,
      sender: 'doctor',
      text,
      time:   getTime(),
      read:   true,
    }

    setConversations((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), doctorMsg],
    }))
    setInput('')

    // Simulate patient typing then replying
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const replies = [
        "Thanks, Doctor. I'll keep that in mind.",
        "Understood! I'll update you after my next session.",
        "Got it. Should I also log this in the app?",
        "Thank you for the quick response!",
        "Okay, I'll follow your instructions carefully.",
      ]
      const patientReply: ChatMessage = {
        id:     `${activeId}-${Date.now() + 1}`,
        sender: 'patient',
        text:   replies[Math.floor(Math.random() * replies.length)],
        time:   getTime(),
        read:   true,
      }
      setConversations((prev) => ({
        ...prev,
        [activeId]: [...(prev[activeId] || []), patientReply],
      }))
    }, 1500)
  }, [input, activeId])

  /* ── Derived state ── */
  const activePatient  = patients.find((p) => p._id === activeId) ?? null
  const activeMessages = activeId ? (conversations[activeId] ?? []) : []
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Page header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Messages
            {totalUnread > 0 && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 font-semibold">
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p className="text-white/60 mt-1">Secure messaging with your assigned patients.</p>
        </div>
      </div>

      {/* ── Two-pane layout ── */}
      <div className="flex gap-5" style={{ height: 'calc(100vh - 220px)', minHeight: '520px' }}>

        {/* ════════════════════════════════════════
            LEFT PANE — Inbox (30%)
        ════════════════════════════════════════ */}
        <GlassCard className="w-[30%] shrink-0 flex flex-col overflow-hidden">

          {/* Search */}
          <div className="p-3 border-b border-white/8 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="h-10 w-10 rounded-full bg-white/8 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/8 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center px-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-white/10" />
                <p className="text-white/25 text-xs">No conversations found</p>
              </div>
            ) : (
              filteredPatients.map((p) => (
                <InboxItem
                  key={p._id}
                  patient={p}
                  messages={conversations[p._id] ?? []}
                  isActive={activeId === p._id}
                  unread={unreadCounts[p._id] ?? 0}
                  onClick={() => selectPatient(p._id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div className="px-4 py-2.5 border-t border-white/8 shrink-0">
              <p className="text-[10px] text-white/20 text-center">
                {patients.length} patient{patients.length !== 1 ? 's' : ''} · HIPAA-compliant
              </p>
            </div>
          )}
        </GlassCard>

        {/* ════════════════════════════════════════
            RIGHT PANE — Chat window (70%)
        ════════════════════════════════════════ */}
        <GlassCard className="flex-1 flex flex-col overflow-hidden">
          {!activePatient ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                <MessageSquare className="h-8 w-8 text-white/15" />
              </div>
              <p className="text-white/30 text-sm">Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/50 to-violet-500/50 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-white">
                      {activePatient.name.charAt(0)}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#050505]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{activePatient.name}</p>
                    <p className="text-[11px] text-emerald-400">
                      Online · {activePatient.condition ?? 'Patient'}
                    </p>
                  </div>
                </div>

                {/* Video call ghost button */}
                <button
                  type="button"
                  onClick={() => alert('Video call feature coming soon.')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
                >
                  <Video className="h-3.5 w-3.5" />
                  Start Video Call
                </button>
              </div>

              {/* ── Messages area ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {activeMessages.map((msg) => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>

              {/* ── Input bar ── */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-3 px-4 py-3 border-t border-white/8 shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${activePatient.name}…`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/8 disabled:text-white/20 text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:shadow-none shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
