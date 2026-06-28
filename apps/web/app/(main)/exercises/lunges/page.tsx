'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import ExerciseShell from '../components/ExerciseShell'
import { buildAIDebriefPayload } from '@/lib/ai-debrief'
import { useAIDebrief } from '@/hooks/useAIDebrief'

const L_HIP = 23, L_KNEE = 25, L_ANKLE = 27
const UP_THRESHOLD   = 155
const DOWN_THRESHOLD = 110
const GOOD_DEPTH_MIN = 80
const GOOD_DEPTH_MAX = 110

type SessionEntry = { timestamp: number; angle: number; reps: number; feedback?: string; stage?: string }

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
  'Stand tall with feet hip-width apart',
  'Step one foot forward into a lunge position',
  'Lower your back knee toward the floor',
  'Front knee should stay above your ankle',
  'Push through your front heel to return to standing',
  'Alternate legs for each rep',
]

const TIPS = [
  'Face the camera side-on for best tracking',
  'Keep full body in frame',
  'Rep counts on return to standing',
  'Runs entirely in your browser — no backend needed',
]

export default function LungesPage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const stateRef      = useRef<{ stage: 'up' | 'down' | null; reps: number; started: boolean }>({ stage: null, reps: 0, started: false })
  const sessionLogRef = useRef<SessionEntry[]>([])
  const { debriefStatus, debriefText, resetAIDebrief, requestDebrief } = useAIDebrief()

  const [ready,   setReady]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stats,   setStats]   = useState({ reps: 0, angle: 0, feedback: '', stage: '' })
  const [err,     setErr]     = useState('')
  const [summary, setSummary] = useState<{ peakReps: number; minAngle: number; total: number } | null>(null)

  const [currentLandmarks, setCurrentLandmarks] = useState<any>(null)
  const lastLandmarkUpdate = useRef<number>(0)

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
    let feedback = '', displayAngle = 0

    if (results.landmarks.length > 0) {
      const lm = results.landmarks[0]!
      const pt = (i: number) => [lm[i]!.x, lm[i]!.y]

      const angle = calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE))
      displayAngle = Math.round(angle)

      if (angle >= UP_THRESHOLD) {
        if (s.stage === 'down') s.reps++
        s.stage = 'up'
      } else if (angle <= DOWN_THRESHOLD) {
        s.started = true; s.stage = 'down'
      }

      if (s.started) {
        if (s.stage === 'down') {
          feedback = angle >= GOOD_DEPTH_MIN && angle <= GOOD_DEPTH_MAX ? '✓ Good depth!' : angle > GOOD_DEPTH_MAX ? 'Go deeper into the lunge' : '✓ Deep lunge — push back up'
        } else if (s.stage === 'up' && angle >= UP_THRESHOLD) {
          feedback = '✓ Stand tall'
        }
      }

      const du = new DrawingUtils(ctx)
      ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#a78bfa', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#67e8f9', lineWidth: 2 })
      ctx.restore()

      sessionLogRef.current.push({ timestamp: performance.now(), angle: displayAngle, reps: s.reps, feedback, stage: s.stage ?? 'up' })
    }

    setStats({ reps: s.reps, angle: displayAngle, feedback, stage: s.stage ?? '' })
    const now = Date.now()
    if (now - lastLandmarkUpdate.current > 333) {
      if (results.poseLandmarks || (results.landmarks && results.landmarks[0])) {
        const marks = results.poseLandmarks || results.landmarks[0]
        setCurrentLandmarks(marks)
        lastLandmarkUpdate.current = now
      }
    }
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const handleStart = useCallback(async () => {
    setErr(''); setSummary(null); sessionLogRef.current = []; resetAIDebrief()
    await startCamera()
    stateRef.current = { stage: null, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: '' })
    setRunning(true); rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect, resetAIDebrief])

  const handleStop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current); stopCamera(); setRunning(false)
    const log = sessionLogRef.current
    localStorage.setItem('lunges-session-log', JSON.stringify(log))
    if (log.length > 0) {
      setSummary({ peakReps: Math.max(...log.map(e => e.reps)), minAngle: Math.min(...log.map(e => e.angle)), total: log.length })
      await requestDebrief(buildAIDebriefPayload('lunges', log, stateRef.current.reps))
    }
    sessionLogRef.current = []
  }, [stopCamera, requestDebrief])

  const handleReset = useCallback(() => {
    stateRef.current = { stage: null, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: '' }); setSummary(null)
    resetAIDebrief()
  }, [resetAIDebrief])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  return (
    <ExerciseShell
      exerciseName="Lunges"
      description="Strengthen your legs and glutes. AI tracks reps and depth — runs entirely in your browser."
      accentColor="amber"
      ready={ready}
      running={running}
      stats={stats}
      error={err}
      debriefStatus={debriefStatus}
      debriefText={debriefText}
      summary={summary ?? undefined}
      instructions={INSTRUCTIONS}
      tips={TIPS}
      onStart={handleStart}
      onStop={handleStop}
      onReset={handleReset}
      wsEndpoint="ws://127.0.0.1:8000/ws"
      landmarks={currentLandmarks}
      onDownload={() => downloadLog('lunges', JSON.parse(localStorage.getItem('lunges-session-log') ?? '[]'))}
      videoSlot={<video ref={videoRef} autoPlay playsInline muted className="hidden" />}
      canvasSlot={
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover absolute inset-0 ${running ? 'block' : 'hidden'}`}
        />
      }
    />
  )
}
