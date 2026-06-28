'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Send, Video, Search,
  Loader2, CheckCheck, RefreshCw,
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
  _id: string
  sender: { _id: string; name: string; role: string }
  receiver: { _id: string; name: string; role: string }
  text: string
  timestamp: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/8 ${className}`} />
}

function getTime(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date()
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
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
   Left pane — inbox list item
───────────────────────────────────────────── */
function InboxItem({
  patient,
  lastMsg,
  isActive,
  unread,
  onClick,
}: {
  patient: Patient
  lastMsg: ChatMessage | null
  isActive: boolean
  unread: number
  onClick: () => void
}) {
  const preview = lastMsg
    ? (lastMsg.sender.role === 'doctor' ? 'You: ' : '') +
      (lastMsg.text.length > 42 ? lastMsg.text.slice(0, 42) + '…' : lastMsg.text)
    : 'No messages yet'

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
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#050505]" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
            {patient.name}
          </p>
          {lastMsg && (
            <span className="text-[10px] text-white/25 shrink-0">{getTime(lastMsg.timestamp)}</span>
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
function ChatBubble({ msg, myId }: { msg: ChatMessage; myId: string }) {
  const isMe = msg.sender._id === myId
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-1 ${
        isMe
          ? 'bg-gradient-to-br from-cyan-500/50 to-violet-500/50 border border-cyan-500/30 text-white'
          : 'bg-white/8 border border-white/10 text-white/60'
      }`}>
        {isMe ? 'Dr' : 'P'}
      </div>

      {/* Bubble + time */}
      <div className={`max-w-[68%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'rounded-br-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white'
            : 'rounded-bl-sm bg-white/8 border border-white/10 text-white/85'
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-white/25">{getTime(msg.timestamp)}</span>
          {isMe && <CheckCheck className="h-3 w-3 text-cyan-400/60" />}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function MessagesPage() {
  const [myId, setMyId] = useState<string | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  // messages per patient: { patientId -> ChatMessage[] }
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({})
  const [threadLoading, setThreadLoading] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threads, activeId])

  /* ── Fetch my id + patients on mount ── */
  useEffect(() => {
    const run = async () => {
      const token = getToken()
      if (!token) { router.push('/login'); return }

      try {
        // Get authenticated doctor's ID
        const meRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (meRes.ok) {
          const me = await meRes.json()
          setMyId(me.id ?? me._id)
        }

        // Get patients (triage endpoint returns assigned patients)
        const res = await fetch(`${API}/dashboard/doctor/triage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data: Patient[] = await res.json()
          setPatients(data)
          if (data.length > 0) setActiveId(data[0]._id)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [router])

  /* ── Fetch thread for active patient ── */
  const fetchThread = useCallback(async (patientId: string, silent = false) => {
    const token = getToken()
    if (!token || !patientId) return
    if (!silent) setThreadLoading(true)
    try {
      const res = await fetch(`${API}/messages/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const msgs: ChatMessage[] = data.messages ?? []

      setThreads((prev) => {
        const existing = prev[patientId] ?? []
        // Count new messages from patient (not from doctor) since last load
        const prevLen = existing.length
        const newPatientMsgs = msgs.slice(prevLen).filter(
          (m) => m.sender._id !== myId
        ).length
        if (newPatientMsgs > 0 && patientId !== activeId) {
          setUnreadCounts((u) => ({ ...u, [patientId]: (u[patientId] ?? 0) + newPatientMsgs }))
        }
        return { ...prev, [patientId]: msgs }
      })
    } catch (err) { console.error(err) }
    finally { if (!silent) setThreadLoading(false) }
  }, [myId, activeId])

  /* ── Load thread when active patient changes ── */
  useEffect(() => {
    if (!activeId) return
    fetchThread(activeId)
    setUnreadCounts((prev) => ({ ...prev, [activeId]: 0 }))
  }, [activeId, fetchThread])

  /* ── 3-second polling for active thread ── */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeId) return

    pollRef.current = setInterval(() => {
      fetchThread(activeId, true)
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeId, fetchThread])

  /* ── Send message ── */
  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !activeId || sending) return

    const token = getToken()
    if (!token) return

    setSending(true)
    setInput('')

    // Optimistic update
    const optimistic: ChatMessage = {
      _id: `optimistic-${Date.now()}`,
      sender: { _id: myId ?? '', name: 'Doctor', role: 'doctor' },
      receiver: { _id: activeId, name: '', role: 'patient' },
      text,
      timestamp: new Date().toISOString(),
    }
    setThreads((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), optimistic],
    }))

    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: activeId, text }),
      })
      const data = await res.json()
      if (res.ok) {
        // Replace optimistic with real message
        setThreads((prev) => ({
          ...prev,
          [activeId]: [
            ...(prev[activeId] ?? []).filter((m) => m._id !== optimistic._id),
            data.message,
          ],
        }))
      } else {
        // Rollback
        setThreads((prev) => ({
          ...prev,
          [activeId]: (prev[activeId] ?? []).filter((m) => m._id !== optimistic._id),
        }))
      }
    } catch {
      // Rollback
      setThreads((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).filter((m) => m._id !== optimistic._id),
      }))
    } finally {
      setSending(false)
    }
  }, [input, activeId, sending, myId])

  /* ── Derived state ── */
  const activePatient = patients.find((p) => p._id === activeId) ?? null
  const activeMessages = activeId ? (threads[activeId] ?? []) : []
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
          <p className="text-white/60 mt-1">Secure bidirectional messaging with your assigned patients.</p>
        </div>
        {/* Manual refresh for active thread */}
        {activeId && (
          <button
            type="button"
            onClick={() => fetchThread(activeId)}
            title="Refresh thread"
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
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
              <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01] m-3">
                <MessageSquare className="h-8 w-8 mb-2 text-white/10" />
                <p className="text-white/25 text-xs text-center">No patients found</p>
              </div>
            ) : (
              filteredPatients.map((p) => {
                const msgs = threads[p._id] ?? []
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null
                return (
                  <InboxItem
                    key={p._id}
                    patient={p}
                    lastMsg={lastMsg}
                    isActive={activeId === p._id}
                    unread={unreadCounts[p._id] ?? 0}
                    onClick={() => {
                      setActiveId(p._id)
                      setUnreadCounts((prev) => ({ ...prev, [p._id]: 0 }))
                    }}
                  />
                )
              })
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div className="px-4 py-2.5 border-t border-white/8 shrink-0">
              <p className="text-[10px] text-white/20 text-center">
                {patients.length} patient{patients.length !== 1 ? 's' : ''} · Live polling active
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs font-medium transition-all"
                >
                  <Video className="h-3.5 w-3.5" />
                  Start Video Call
                </button>
              </div>

              {/* ── Messages area ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {threadLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                        <div className="h-7 w-7 rounded-full bg-white/8 animate-pulse shrink-0" />
                        <div className="h-10 rounded-2xl bg-white/8 animate-pulse" style={{ width: `${40 + i * 8}%` }} />
                      </div>
                    ))}
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-white/[0.01]">
                      <MessageSquare className="h-8 w-8 text-white/10 mb-2" />
                      <p className="text-white/30 text-sm">No messages yet</p>
                      <p className="text-white/15 text-xs mt-1">
                        Send the first message to {activePatient.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  activeMessages.map((msg) => (
                    <ChatBubble key={msg._id} msg={msg} myId={myId ?? ''} />
                  ))
                )}

                {sending && <TypingIndicator />}
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
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/8 disabled:text-white/20 text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:shadow-none hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] shrink-0"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
