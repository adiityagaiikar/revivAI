'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import ExerciseShell from '../components/ExerciseShell'
import { buildAIDebriefPayload } from '@/lib/ai-debrief'
import { useAIDebrief } from '@/hooks/useAIDebrief'

const L_HIP = 23, L_KNEE = 25, L_ANKLE = 27
const R_HIP = 24, R_KNEE = 26, R_ANKLE = 28
const FRONT_KNEE_MIN    = 80
const FRONT_KNEE_MAX    = 110
const BACK_LEG_STRAIGHT = 160
const HOLD_REP_FRAMES   = 30

type SessionEntry = { timestamp: number; angle: number; holdFrames: number; reps: number; feedback?: string }

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
  'Stand with feet 3–4 feet apart',
  'Turn your front foot forward, back foot at 45°',
  'Bend your front knee to 90° — knee over ankle',
  'Keep your back leg straight and strong',
  'Raise arms parallel to the floor, gaze forward',
  'Hold the pose — each second of good form counts',
]

const TIPS = [
  'Good side-on lighting helps accuracy',
  'Keep full body in frame',
  'Each 30-frame hold = 1 rep',
  'Runs entirely in your browser — no backend needed',
]

export default function WarriorPosePage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const stateRef      = useRef({ reps: 0, holdFrames: 0, started: false })
  const sessionLogRef = useRef<SessionEntry[]>([])
  const { debriefStatus, debriefText, resetAIDebrief, requestDebrief } = useAIDebrief()

  const [ready,   setReady]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stats,   setStats]   = useState({ reps: 0, angle: 0, feedback: '', holdFrames: 0 })
  const [err,     setErr]     = useState('')
  const [summary, setSummary] = useState<{ peakReps: number; peakHold: number; total: number } | null>(null)

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

      const frontKnee = calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE))
      const backLeg   = calcAngle(pt(R_HIP), pt(R_KNEE), pt(R_ANKLE))
      displayAngle = Math.round(frontKnee)

      if (frontKnee <= FRONT_KNEE_MAX) s.started = true

      if (s.started) {
        if (backLeg < BACK_LEG_STRAIGHT) {
          feedback = 'Keep your back leg straight'; s.holdFrames = 0
        } else if (frontKnee < FRONT_KNEE_MIN) {
          feedback = 'Front knee too bent — ease up slightly'; s.holdFrames = 0
        } else if (frontKnee > FRONT_KNEE_MAX) {
          feedback = 'Bend front knee deeper to ~90°'; s.holdFrames = 0
        } else {
          feedback = '✓ Good form — hold it!'
          s.holdFrames++
          if (s.holdFrames > 0 && s.holdFrames % HOLD_REP_FRAMES === 0) s.reps++
        }
      }

      const du = new DrawingUtils(ctx)
      ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#a78bfa', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#67e8f9', lineWidth: 2 })
      ctx.restore()

      sessionLogRef.current.push({ timestamp: performance.now(), angle: displayAngle, holdFrames: s.holdFrames, reps: s.reps, feedback })
    }

    setStats({ reps: s.reps, angle: displayAngle, feedback, holdFrames: s.holdFrames })
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const handleStart = useCallback(async () => {
    setErr(''); setSummary(null); sessionLogRef.current = []; resetAIDebrief()
    await startCamera()
    stateRef.current = { reps: 0, holdFrames: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', holdFrames: 0 })
    setRunning(true); rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect, resetAIDebrief])

  const handleStop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current); stopCamera(); setRunning(false)
    const log = sessionLogRef.current
    localStorage.setItem('warrior-pose-session-log', JSON.stringify(log))
    if (log.length > 0) {
      setSummary({ peakReps: Math.max(...log.map(e => e.reps)), peakHold: Math.max(...log.map(e => e.holdFrames)), total: log.length })
      await requestDebrief(buildAIDebriefPayload('warrior pose', log, stateRef.current.reps))
    }
    sessionLogRef.current = []
  }, [stopCamera, requestDebrief])

  const handleReset = useCallback(() => {
    stateRef.current = { reps: 0, holdFrames: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', holdFrames: 0 }); setSummary(null)
    resetAIDebrief()
  }, [resetAIDebrief])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  return (
    <ExerciseShell
      exerciseName="Warrior Pose"
      description="Build stability and strength. AI tracks your hold time and flags form errors — runs entirely in your browser."
      accentColor="emerald"
      ready={ready}
      running={running}
      stats={{ ...stats, holdFrames: stats.holdFrames }}
      error={err}
      debriefStatus={debriefStatus}
      debriefText={debriefText}
      summary={summary ? { peakReps: summary.peakReps, peakHold: summary.peakHold, total: summary.total } : undefined}
      instructions={INSTRUCTIONS}
      tips={TIPS}
      onStart={handleStart}
      onStop={handleStop}
      onReset={handleReset}
      onDownload={() => downloadLog('warrior-pose', JSON.parse(localStorage.getItem('warrior-pose-session-log') ?? '[]'))}
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
