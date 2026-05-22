'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { Mic } from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ElevenLabsVoiceChat } from '@/components/elevenlabs-voice-chat'
import ExerciseShell from '../components/ExerciseShell'
import { buildAIDebriefPayload } from '@/lib/ai-debrief'
import { useAIDebrief } from '@/hooks/useAIDebrief'
import { calculateFormScore } from '@/lib/scoring'

const AGENT_ID = 'agent_5201kndzmwmmew99xsex4237d84t'

const L_HIP = 23, L_KNEE = 25, L_ANKLE = 27
const R_HIP = 24, R_KNEE = 26, R_ANKLE = 28
const UP_THRESHOLD   = 150
const DOWN_THRESHOLD = 110
const GOOD_DEPTH_MIN = 80
const GOOD_DEPTH_MAX = 110
const ANGLE_SMOOTH   = 0.40
const MIN_VIS        = 0.45

type SessionEntry = { timestamp: number; wallTime: number; angle: number; reps: number; feedback?: string; stage?: string }
type SessionAvg   = { session: number; avgAngle: number; totalReps: number; date: string }

function calcAngle(a: number[], b: number[], c: number[]) {
  const ab = [a[0]! - b[0]!, a[1]! - b[1]!]
  const cb = [c[0]! - b[0]!, c[1]! - b[1]!]
  const dot = ab[0]! * cb[0]! + ab[1]! * cb[1]!
  const mag = Math.sqrt(ab[0]! ** 2 + ab[1]! ** 2) * Math.sqrt(cb[0]! ** 2 + cb[1]! ** 2)
  return (Math.acos(Math.min(Math.max(dot / (mag || 1), -1), 1)) * 180) / Math.PI
}

function downloadLog(key: string, log: SessionEntry[]) {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${key}-session-${Date.now()}.json`; a.click()
  URL.revokeObjectURL(url)
}

const INSTRUCTIONS = [
  'Stand with feet shoulder-width apart, toes slightly outward',
  'Keep your chest up and core engaged',
  'Lower your hips back and down as if sitting in a chair',
  'Go down until thighs are parallel to the ground',
  'Push through your heels to return to standing',
  'Keep knees tracking over toes — don\'t let them cave inward',
]

const TIPS = [
  'Position camera at side angle for best tracking',
  'Keep full body in frame',
  'Session data saved automatically on stop',
  'Runs entirely in your browser — no backend needed',
]

export default function SquatsPage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const stateRef      = useRef({ stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false })
  const sessionLogRef = useRef<SessionEntry[]>([])
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { debriefStatus, debriefText, resetAIDebrief, requestDebrief } = useAIDebrief()

  const [ghostLandmarks, setGhostLandmarks] = useState<any>(null)
  const ghostLandmarksRef = useRef<any>(null)

  const [ready,         setReady]         = useState(false)
  const [running,       setRunning]       = useState(false)
  const [stats,         setStats]         = useState({ reps: 0, angle: 0, feedback: '', stage: 'up' })
  const [err,           setErr]           = useState('')
  const [summary,       setSummary]       = useState<{ peakReps: number; minAngle: number; total: number } | null>(null)
  const [scorePopup,    setScorePopup]    = useState<string | null>(null)
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<SessionAvg[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('squats-session-history') ?? '[]') } catch { return [] }
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        const pl = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        if (!cancelled) { landmarkerRef.current = pl; setReady(true) }
      } catch {
        if (!cancelled) setErr('Failed to load pose model. Check your connection.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
    } catch { setErr('Camera access denied.') }
  }, [])

  const stopCamera = useCallback(() => {
    const v = videoRef.current
    if (v?.srcObject) { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()); v.srcObject = null }
  }, [])

  const detect = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current, pl = landmarkerRef.current
    if (!video || !canvas || !pl || video.readyState < 2) { rafRef.current = requestAnimationFrame(detect); return }

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0); ctx.restore()

    const results = pl.detectForVideo(video, performance.now())
    const s = stateRef.current
    let feedback = ''

    if (results.landmarks.length > 0) {
      const lm  = results.landmarks[0]!
      const vis = (i: number) => lm[i]?.visibility ?? 0
      const pt  = (i: number) => [lm[i]!.x, lm[i]!.y]

      const leftOk  = Math.min(vis(L_HIP), vis(L_KNEE), vis(L_ANKLE)) >= MIN_VIS
      const rightOk = Math.min(vis(R_HIP), vis(R_KNEE), vis(R_ANKLE)) >= MIN_VIS

      let angle = 0
      if (leftOk && rightOk) angle = (calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE)) + calcAngle(pt(R_HIP), pt(R_KNEE), pt(R_ANKLE))) / 2
      else if (leftOk)       angle = calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE))
      else if (rightOk)      angle = calcAngle(pt(R_HIP), pt(R_KNEE), pt(R_ANKLE))

      if (angle > 0) s.smoothed = s.smoothed ? ANGLE_SMOOTH * angle + (1 - ANGLE_SMOOTH) * s.smoothed : angle
      const sa = s.smoothed
      if (s.cooldown > 0) s.cooldown--

      const prevReps = s.reps
      if (sa >= UP_THRESHOLD) {
        if (s.stage === 'down' && s.cooldown === 0) { s.reps++; s.cooldown = 8 }
        s.stage = 'up'
      } else if (sa <= DOWN_THRESHOLD) {
        s.started = true; s.stage = 'down'
      }

      if (s.reps > prevReps) {
        setScorePopup('+1 rep')
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
        popupTimerRef.current = setTimeout(() => setScorePopup(null), 1200)
      }

      if (s.started) {
        if (s.stage === 'down') {
          feedback = sa >= GOOD_DEPTH_MIN && sa <= GOOD_DEPTH_MAX ? '✓ Good depth!' : sa > GOOD_DEPTH_MAX ? 'Bend your knees more' : ''
        } else if (s.stage === 'up' && sa >= UP_THRESHOLD) {
          feedback = '✓ Stand tall'
        }
      }

      const currentDisplayAngle = Math.round(sa / 20) * 20
      const score = calculateFormScore(currentDisplayAngle, 'Squats')
      if (score === 100 && !ghostLandmarksRef.current && s.started) {
        ghostLandmarksRef.current = lm
        setGhostLandmarks(lm)
      }

      const du = new DrawingUtils(ctx)
      ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1)

      if (ghostLandmarksRef.current) {
        ctx.setLineDash([5, 5])
        du.drawLandmarks(ghostLandmarksRef.current, { color: 'rgba(255,255,255,0.2)', lineWidth: 2, radius: 2 })
        du.drawConnectors(ghostLandmarksRef.current, PoseLandmarker.POSE_CONNECTIONS, { color: 'rgba(255,255,255,0.2)', lineWidth: 2 })
        ctx.setLineDash([])
      }

      du.drawLandmarks(lm, { color: '#a78bfa', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#67e8f9', lineWidth: 2 })
      ctx.restore()
    }

    const displayAngle = Math.round(s.smoothed / 20) * 20
    setStats({ reps: s.reps, angle: displayAngle, feedback, stage: s.stage })
    sessionLogRef.current.push({
      timestamp: performance.now(),
      wallTime: Date.now(),
      angle: displayAngle,
      reps: s.reps,
      feedback,
      stage: s.stage,
    })
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const handleStart = useCallback(async () => {
    setErr(''); setSummary(null); sessionLogRef.current = []; resetAIDebrief()
    await startCamera()
    stateRef.current = { stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: 'up' })
    setRunning(true); rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect, resetAIDebrief])

  const handleStop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
    setScorePopup(null)
    stopCamera(); setRunning(false)
    const log = sessionLogRef.current
    localStorage.setItem('squats-session-log', JSON.stringify(log))
    if (log.length > 0) {
      const peakReps = Math.max(...log.map(e => e.reps))
      const minAngle = Math.min(...log.map(e => e.angle))
      const avgAngle = Math.round(log.reduce((s, e) => s + e.angle, 0) / log.length)
      setSummary({ peakReps, minAngle, total: log.length })
      setSessionHistory(prev => {
        const next = [...prev, { session: prev.length + 1, avgAngle, totalReps: peakReps, date: new Date().toLocaleDateString() }]
        localStorage.setItem('squats-session-history', JSON.stringify(next))
        return next
      })
      await requestDebrief(buildAIDebriefPayload('squats', log, peakReps))
    }
    sessionLogRef.current = []
  }, [stopCamera, requestDebrief])

  const handleReset = useCallback(() => {
    stateRef.current = { stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: 'up' }); setSummary(null)
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current); setScorePopup(null)
    ghostLandmarksRef.current = null; setGhostLandmarks(null)
    resetAIDebrief()
  }, [resetAIDebrief])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  return (
    <>
      <ExerciseShell
        exerciseName="Squats"
        description="Build lower body strength with proper squat form. AI-powered feedback runs entirely in your browser."
        accentColor="cyan"
        ready={ready}
        running={running}
        stats={stats}
        error={err}
        debriefStatus={debriefStatus}
        debriefText={debriefText}
        summary={summary ?? undefined}
        scorePopup={scorePopup ?? undefined}
        instructions={INSTRUCTIONS}
        tips={TIPS}
        demoGif="https://media1.tenor.com/m/1NY6qOs30XIAAAAd/goblet-squad.gif"
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onDownload={() => downloadLog('squats', JSON.parse(localStorage.getItem('squats-session-log') ?? '[]'))}
        videoSlot={<video ref={videoRef} autoPlay playsInline muted className="hidden" />}
        canvasSlot={
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover absolute inset-0 ${running ? 'block' : 'hidden'}`}
          />
        }
        extraControls={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setVoiceChatOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Mic className="h-4 w-4" />
            Voice Coach
          </motion.button>
        }
      />

      {/* Session history chart */}
      {sessionHistory.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-6 mt-6">
          <h3 className="text-white font-semibold mb-1 text-sm">Session History</h3>
          <p className="text-xs text-white/35 mb-4">Average angle and peak reps across all sessions</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sessionHistory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="session" stroke="#444" fontSize={11} tickFormatter={(v) => `S${v}`} />
              <YAxis yAxisId="reps"  stroke="#67e8f9" fontSize={11} />
              <YAxis yAxisId="angle" orientation="right" stroke="#a78bfa" fontSize={11} domain={[0, 180]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: 11 }}
                formatter={(val: any, name: any) => [name === 'totalReps' ? `${val} reps` : `${val}°`, name === 'totalReps' ? 'Peak Reps' : 'Avg Angle']}
                labelFormatter={(l) => `Session ${l}`}
              />
              <Legend formatter={(val) => val === 'totalReps' ? 'Peak Reps' : 'Avg Angle (°)'} wrapperStyle={{ fontSize: 11, color: '#666' }} />
              <Line yAxisId="reps"  type="monotone" dataKey="totalReps" stroke="#67e8f9" strokeWidth={2} dot={{ r: 4, fill: '#67e8f9' }} activeDot={{ r: 6 }} />
              <Line yAxisId="angle" type="monotone" dataKey="avgAngle"  stroke="#a78bfa" strokeWidth={2} dot={{ r: 4, fill: '#a78bfa' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <ElevenLabsVoiceChat agentId={AGENT_ID} active={voiceChatOpen} onClose={() => setVoiceChatOpen(false)} />
    </>
  )
}
