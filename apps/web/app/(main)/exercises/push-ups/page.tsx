'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import ExerciseShell from '../components/ExerciseShell'
import { buildAIDebriefPayload } from '@/lib/ai-debrief'
import { useAIDebrief } from '@/hooks/useAIDebrief'

/* ── Landmark indices ── */
const L_SHOULDER = 11, L_ELBOW = 13, L_WRIST = 15
const R_SHOULDER = 12, R_ELBOW = 14, R_WRIST = 16

const UP_THRESHOLD   = 150
const DOWN_THRESHOLD = 110
const GOOD_DOWN_MIN  = 80
const GOOD_DOWN_MAX  = 110
const ANGLE_SMOOTH   = 0.4
const MIN_VIS        = 0.45

function calcAngle(a: number[], b: number[], c: number[]) {
  const ab = [a[0]! - b[0]!, a[1]! - b[1]!]
  const cb = [c[0]! - b[0]!, c[1]! - b[1]!]
  const dot = ab[0]! * cb[0]! + ab[1]! * cb[1]!
  const mag = Math.sqrt(ab[0]! ** 2 + ab[1]! ** 2) * Math.sqrt(cb[0]! ** 2 + cb[1]! ** 2)
  return (Math.acos(Math.min(Math.max(dot / (mag || 1), -1), 1)) * 180) / Math.PI
}

const INSTRUCTIONS = [
  'Start in a high plank — hands shoulder-width apart',
  'Keep your body in a straight line from head to heels',
  'Lower your chest until elbows reach ~90°',
  'Push back up to full arm extension',
  'Keep core tight throughout — don\'t let hips sag',
  'Breathe in on the way down, out on the way up',
]

const TIPS = [
  'Face camera from the side for best tracking',
  'Good lighting on arms helps accuracy',
  'Target elbow angle: ~90° at bottom',
  'Runs entirely in your browser — no backend needed',
]

export default function PushUpsPage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const stateRef      = useRef({ stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false })
  const sessionLogRef = useRef<Array<{ timestamp: number; angle: number; reps: number; feedback: string; stage: string }>>([])
  const { debriefStatus, debriefText, resetAIDebrief, requestDebrief } = useAIDebrief()

  const [ready,   setReady]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stats,   setStats]   = useState({ reps: 0, angle: 0, feedback: '', stage: 'up' })
  const [err,     setErr]     = useState('')

  const [currentLandmarks, setCurrentLandmarks] = useState<any>(null)
  const lastLandmarkUpdate = useRef<number>(0)

  /* Load MediaPipe model once */
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

      const leftOk  = Math.min(vis(L_SHOULDER), vis(L_ELBOW), vis(L_WRIST)) >= MIN_VIS
      const rightOk = Math.min(vis(R_SHOULDER), vis(R_ELBOW), vis(R_WRIST)) >= MIN_VIS

      let angle = 0
      if (leftOk && rightOk)  angle = (calcAngle(pt(L_SHOULDER), pt(L_ELBOW), pt(L_WRIST)) + calcAngle(pt(R_SHOULDER), pt(R_ELBOW), pt(R_WRIST))) / 2
      else if (leftOk)        angle = calcAngle(pt(L_SHOULDER), pt(L_ELBOW), pt(L_WRIST))
      else if (rightOk)       angle = calcAngle(pt(R_SHOULDER), pt(R_ELBOW), pt(R_WRIST))

      if (angle > 0) s.smoothed = s.smoothed ? ANGLE_SMOOTH * angle + (1 - ANGLE_SMOOTH) * s.smoothed : angle
      const sa = s.smoothed
      if (s.cooldown > 0) s.cooldown--

      if (sa >= UP_THRESHOLD) {
        if (s.stage === 'down' && s.cooldown === 0) { s.reps++; s.cooldown = 8 }
        s.stage = 'up'
      } else if (sa <= DOWN_THRESHOLD) {
        s.started = true; s.stage = 'down'
      }

      if (s.started) {
        if (s.stage === 'down') {
          if (sa >= GOOD_DOWN_MIN && sa <= GOOD_DOWN_MAX) feedback = '✓ Good depth!'
          else if (sa > GOOD_DOWN_MAX)                    feedback = 'Lower your chest more'
          else                                            feedback = '✓ Deep — push up!'
        } else if (s.stage === 'up' && sa >= UP_THRESHOLD) {
          feedback = '✓ Arms extended'
        }
      }

      const du = new DrawingUtils(ctx)
      ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#a78bfa', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#67e8f9', lineWidth: 2 })
      ctx.restore()
    }

    setStats({ reps: s.reps, angle: Math.round(s.smoothed), feedback, stage: s.stage })
    sessionLogRef.current.push({
      timestamp: performance.now(),
      angle: Math.round(s.smoothed),
      reps: s.reps,
      feedback,
      stage: s.stage,
    })
    const now = Date.now()
    if (now - lastLandmarkUpdate.current > 333) {
      if (results.landmarks && results.landmarks[0]) {
        const marks = results.landmarks[0]
        setCurrentLandmarks(marks)
        lastLandmarkUpdate.current = now
      }
    }
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const handleStart = useCallback(async () => {
    setErr('')
    resetAIDebrief()
    sessionLogRef.current = []
    await startCamera()
    stateRef.current = { stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: 'up' })
    setRunning(true)
    rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect, resetAIDebrief])

  const handleStop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    stopCamera()
    setRunning(false)
    const log = sessionLogRef.current
    if (log.length > 0) {
      await requestDebrief(buildAIDebriefPayload('push-ups', log, stateRef.current.reps))
    }
    sessionLogRef.current = []
  }, [requestDebrief, stopCamera])

  const handleReset = useCallback(() => {
    stateRef.current = { stage: 'up', smoothed: 0, cooldown: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '', stage: 'up' })
    resetAIDebrief()
  }, [resetAIDebrief])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  return (
    <ExerciseShell
      exerciseName="Push-ups"
      description="Build upper body strength. AI tracks elbow angle and reps — runs entirely in your browser."
      accentColor="violet"
      ready={ready}
      running={running}
      stats={stats}
      error={err}
      debriefStatus={debriefStatus}
      debriefText={debriefText}
      instructions={INSTRUCTIONS}
      tips={TIPS}
      onStart={handleStart}
      onStop={handleStop}
      onReset={handleReset}
      wsEndpoint="ws://127.0.0.1:8000/ws"
      landmarks={currentLandmarks}
      videoSlot={
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      }
      canvasSlot={
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover absolute inset-0 ${running ? 'block' : 'hidden'}`}
        />
      }
    />
  )
}
