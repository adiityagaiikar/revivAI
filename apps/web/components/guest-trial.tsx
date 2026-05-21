'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Mic, MicOff, X, ArrowRight, Zap, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const TRIAL_SECONDS = 60
const WS_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) ||
  'ws://localhost:8000/ws/squats' // default exercise for guest demo

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Phase = 'idle' | 'requesting' | 'connecting' | 'running' | 'expired' | 'error'

interface WsFrame {
  frame?: string
  rep_count?: number
  angle?: number
  error?: string
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/* ─────────────────────────────────────────────
   GuestTrial — full-screen overlay component
───────────────────────────────────────────── */
export function GuestTrial({ onClose }: { onClose: () => void }) {
  /* refs */
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wsRef       = useRef<WebSocket | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef      = useRef<number>(0)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const processingRef = useRef(false)

  /* state */
  const [phase, setPhase]       = useState<Phase>('idle')
  const [timeLeft, setTimeLeft] = useState(TRIAL_SECONDS)
  const [frameSrc, setFrameSrc] = useState<string | null>(null)
  const [stats, setStats]       = useState({ reps: 0, angle: 0 })
  const [errMsg, setErrMsg]     = useState('')

  /* ── cleanup everything ── */
  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    wsRef.current = null
  }, [])

  /* cleanup on unmount */
  useEffect(() => () => teardown(), [teardown])

  /* ── start the trial ── */
  const startTrial = useCallback(async () => {
    setPhase('requesting')
    setErrMsg('')

    /* 1. Camera */
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    } catch {
      setPhase('error')
      setErrMsg('Camera access was denied. Please allow camera permissions and try again.')
      return
    }
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => {})
    }

    /* 2. WebSocket */
    setPhase('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onerror = () => {
      setPhase('error')
      setErrMsg(
        'Could not connect to the AI analysis server. Make sure the Python backend is running on port 8000.'
      )
      teardown()
    }

    ws.onclose = () => {
      cancelAnimationFrame(rafRef.current)
    }

    ws.onopen = () => {
      setPhase('running')

      /* 3. Countdown timer */
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            expire()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      /* 4. Frame pump */
      const pump = () => {
        if (
          videoRef.current &&
          canvasRef.current &&
          ws.readyState === WebSocket.OPEN &&
          !processingRef.current
        ) {
          processingRef.current = true
          const canvas = canvasRef.current
          canvas.width  = 640
          canvas.height = 480
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 640, 480)
            ws.send(canvas.toDataURL('image/jpeg', 0.75))
          }
        }
        rafRef.current = requestAnimationFrame(pump)
      }
      pump()
    }

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const data: WsFrame = JSON.parse(ev.data)
        if (data.frame) setFrameSrc(`data:image/jpeg;base64,${data.frame}`)
        setStats({ reps: data.rep_count ?? 0, angle: data.angle ?? 0 })
      } catch { /* ignore malformed */ }
      processingRef.current = false
    }
  }, [teardown])

  /* ── expire at 0:00 ── */
  const expire = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) wsRef.current.close()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setPhase('expired')
  }, [])

  /* ── close overlay ── */
  const handleClose = useCallback(() => {
    teardown()
    onClose()
  }, [teardown, onClose])

  const isUrgent = timeLeft <= 10 && phase === 'running'

  return (
    <AnimatePresence>
      <motion.div
        key="guest-trial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)' }}
      >
        {/* ── Close button ── */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 z-50 h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Floating timer pill ── */}
        {(phase === 'running' || phase === 'connecting') && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 z-50"
          >
            <motion.div
              animate={isUrgent ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.7 }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-md text-sm font-semibold ${
                isUrgent
                  ? 'border-red-500/50 bg-red-500/15 text-red-400'
                  : 'border-white/15 bg-white/8 text-white'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isUrgent ? 'bg-red-400 animate-ping' : 'bg-violet-400 animate-pulse'}`}
              />
              Guest Session:&nbsp;
              <motion.span
                key={timeLeft}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={isUrgent ? 'text-red-300 font-bold' : ''}
              >
                {fmt(timeLeft)}
              </motion.span>
            </motion.div>
          </motion.div>
        )}

        {/* ── Main card ── */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-3xl mx-4 rounded-3xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(10,10,10,0.95)' }}
        >
          {/* ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)',
            }}
          />

          {/* ════════════════════════════════
              IDLE — pre-start screen
          ════════════════════════════════ */}
          {phase === 'idle' && (
            <div className="relative z-10 flex flex-col items-center justify-center gap-7 p-12 text-center">
              <div className="h-16 w-16 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">60-Second AI Trial</h2>
                <p className="text-white/50 text-sm max-w-sm leading-relaxed">
                  Experience real-time skeletal tracking powered by MediaPipe. Your camera stays
                  local — nothing is saved or sent to our servers.
                </p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/40 text-left">
                {[
                  '33-point full-body pose estimation',
                  'Live rep counting & joint angle feedback',
                  'Zero data stored — guest session only',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={startTrial}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-xl shadow-violet-900/50"
              >
                <Camera className="h-4 w-4" />
                Allow Camera & Start
              </motion.button>
              <p className="text-xs text-white/20">
                Requires camera permission · Works in Chrome, Edge, Firefox
              </p>
            </div>
          )}

          {/* ════════════════════════════════
              REQUESTING / CONNECTING
          ════════════════════════════════ */}
          {(phase === 'requesting' || phase === 'connecting') && (
            <div className="relative z-10 flex flex-col items-center justify-center gap-5 p-12 text-center min-h-[360px]">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                <div className="h-14 w-14 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-white font-medium">
                {phase === 'requesting' ? 'Requesting camera access…' : 'Connecting to AI engine…'}
              </p>
              <p className="text-white/35 text-sm">
                {phase === 'requesting'
                  ? 'Please allow camera permissions in your browser.'
                  : 'Establishing WebSocket connection to the analysis server.'}
              </p>
            </div>
          )}

          {/* ════════════════════════════════
              ERROR
          ════════════════════════════════ */}
          {phase === 'error' && (
            <div className="relative z-10 flex flex-col items-center justify-center gap-5 p-12 text-center min-h-[360px]">
              <div className="h-14 w-14 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Connection Failed</h3>
                <p className="text-white/45 text-sm max-w-sm leading-relaxed">{errMsg}</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => { setPhase('idle'); setTimeLeft(TRIAL_SECONDS) }}
                  className="px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  Try Again
                </motion.button>
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
                  >
                    Sign Up Instead
                  </motion.button>
                </Link>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              RUNNING — live feed
          ════════════════════════════════ */}
          {phase === 'running' && (
            <div className="relative z-10">
              {/* Video area */}
              <div className="relative aspect-video bg-black overflow-hidden">
                {/* hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* raw camera (hidden once AI frames arrive) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${frameSrc ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* AI-annotated frames */}
                {frameSrc && (
                  <img
                    src={frameSrc}
                    alt="AI tracking feed"
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1"
                  />
                )}

                {/* Stats HUD */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-white text-sm">
                    <span className="text-white/40 text-xs">REPS</span>
                    <span className="font-bold text-lg leading-none">{stats.reps}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-white text-sm">
                    <span className="text-white/40 text-xs">ANGLE</span>
                    <span className="font-bold leading-none">{stats.angle}°</span>
                  </div>
                </div>

                {/* Live badge */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-semibold text-red-300">LIVE</span>
                </div>

                {/* Urgent overlay tint */}
                {isUrgent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.08, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="absolute inset-0 bg-red-500 pointer-events-none z-10"
                  />
                )}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
                <p className="text-xs text-white/30">
                  Guest mode · No data saved · Squats demo
                </p>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <CameraOff className="h-3.5 w-3.5" />
                  End session
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              EXPIRED — conversion modal
          ════════════════════════════════ */}
          {phase === 'expired' && (
            <div className="relative z-10">
              {/* Blurred frozen frame behind */}
              {frameSrc && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <img
                    src={frameSrc}
                    alt=""
                    className="w-full h-full object-cover scale-x-[-1] opacity-30"
                    style={{ filter: 'blur(20px)' }}
                  />
                </div>
              )}

              {/* Conversion content */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-7 p-12 text-center min-h-[420px]">
                {/* Animated checkmark ring */}
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  className="h-20 w-20 rounded-full border-2 border-violet-500/60 bg-violet-500/10 flex items-center justify-center"
                >
                  <Zap className="h-9 w-9 text-violet-400" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-3">Trial Complete!</h2>
                  <p className="text-white/55 text-sm max-w-sm leading-relaxed">
                    The AI has analysed your baseline movement patterns. Create a free account to
                    unlock your full biomechanical report and save your progress.
                  </p>
                </motion.div>

                {/* Stats summary */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                  className="flex gap-6"
                >
                  {[
                    { label: 'Reps Counted', value: stats.reps },
                    { label: 'Avg Angle', value: `${stats.angle}°` },
                    { label: 'Session', value: '60s' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-xl font-bold text-white">{s.value}</p>
                      <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </motion.div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
                >
                  <Link href="/signup" className="flex-1">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-xl shadow-violet-900/50"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 rounded-xl border border-white/15 bg-white/5 text-white/60 hover:text-white text-sm font-medium transition-colors"
                  >
                    Maybe Later
                  </button>
                </motion.div>

                <p className="text-xs text-white/20">Free forever · No credit card required</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
