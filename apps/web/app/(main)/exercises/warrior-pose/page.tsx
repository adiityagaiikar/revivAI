'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Activity, Play, Square, RotateCcw, ArrowLeft, VideoOff, Download } from "lucide-react"
import Link from "next/link"

type SessionEntry = { timestamp: number; angle: number; holdFrames: number; reps: number }

function downloadLog(key: string, log: SessionEntry[]) {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${key}-session-${Date.now()}.json`; a.click()
  URL.revokeObjectURL(url)
}

// Landmark indices
const L_HIP = 23, L_KNEE = 25, L_ANKLE = 27
const R_HIP = 24, R_KNEE = 26, R_ANKLE = 28

// Front knee target ~90° (range 80–110 = good warrior depth)
// Back leg straight target ~180° (range 160–180 = straight)
const FRONT_KNEE_MIN = 80
const FRONT_KNEE_MAX = 110
const BACK_LEG_STRAIGHT = 160   // below this = back leg bent
const HOLD_REP_FRAMES = 30

function calcAngle(a: number[], b: number[], c: number[]) {
  const ab = [a[0] - b[0], a[1] - b[1]]
  const cb = [c[0] - b[0], c[1] - b[1]]
  const dot = ab[0] * cb[0] + ab[1] * cb[1]
  const mag = Math.sqrt(ab[0] ** 2 + ab[1] ** 2) * Math.sqrt(cb[0] ** 2 + cb[1] ** 2)
  return (Math.acos(Math.min(Math.max(dot / (mag || 1), -1), 1)) * 180) / Math.PI
}

export default function WarriorPosePage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const stateRef      = useRef({ reps: 0, holdFrames: 0, started: false })
  const sessionLogRef = useRef<SessionEntry[]>([])

  const [ready,   setReady]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stats,   setStats]   = useState({ reps: 0, angle: 0, feedback: '' })
  const [err,     setErr]     = useState('')
  const [summary, setSummary] = useState<{ total: number; peakReps: number; peakHold: number } | null>(null)

  // Load model once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        const pl = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setErr('Camera access denied.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    const v = videoRef.current
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      v.srcObject = null
    }
  }, [])

  const detect = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    const pl     = landmarkerRef.current
    if (!video || !canvas || !pl || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect)
      return
    }

    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!

    // Draw mirrored frame
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    const results = pl.detectForVideo(video, performance.now())
    const s = stateRef.current
    let feedback = ''
    let displayAngle = 0

    if (results.landmarks.length > 0) {
      const lm = results.landmarks[0]
      const pt = (i: number) => [lm[i].x, lm[i].y]

      const frontKnee = calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE))
      const backLeg   = calcAngle(pt(R_HIP), pt(R_KNEE), pt(R_ANKLE))
      displayAngle = Math.round(frontKnee)

      // Mark as started once user bends into pose
      if (frontKnee <= FRONT_KNEE_MAX) s.started = true

      if (s.started) {
        if (backLeg < BACK_LEG_STRAIGHT) {
          feedback = 'Keep your back leg straight'
          s.holdFrames = 0
        } else if (frontKnee < FRONT_KNEE_MIN) {
          feedback = 'Front knee too bent — ease up slightly'
          s.holdFrames = 0
        } else if (frontKnee > FRONT_KNEE_MAX) {
          feedback = 'Bend front knee deeper to ~90°'
          s.holdFrames = 0
        } else {
          // Good range: 80–110°
          feedback = '✓ Good form — hold it!'
          s.holdFrames++
          if (s.holdFrames > 0 && s.holdFrames % HOLD_REP_FRAMES === 0) {
            s.reps++
          }
        }
      }

      // Draw skeleton
      const du = new DrawingUtils(ctx)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#00FF00', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#00BFFF', lineWidth: 2 })
      ctx.restore()

      // Session log
      sessionLogRef.current.push({ timestamp: performance.now(), angle: displayAngle, holdFrames: s.holdFrames, reps: s.reps })
    }

    setStats({ reps: s.reps, angle: displayAngle, feedback })
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const start = useCallback(async () => {
    setErr('')
    setSummary(null)
    sessionLogRef.current = []
    await startCamera()
    stateRef.current = { reps: 0, holdFrames: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '' })
    setRunning(true)
    rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    stopCamera()
    setRunning(false)
    const log = sessionLogRef.current
    localStorage.setItem('warrior-pose-session-log', JSON.stringify(log))
    if (log.length > 0) {
      setSummary({
        total:    log.length,
        peakReps: Math.max(...log.map(e => e.reps)),
        peakHold: Math.max(...log.map(e => e.holdFrames)),
      })
    }
    sessionLogRef.current = []
  }, [stopCamera])

  const reset = useCallback(() => {
    stateRef.current = { reps: 0, holdFrames: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '' })
    setSummary(null)
  }, [])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  const instructions = [
    "Stand with feet 3–4 feet apart",
    "Turn your front foot forward, back foot at 45°",
    "Bend your front knee to 90° — knee over ankle",
    "Keep your back leg straight and strong",
    "Raise arms parallel to the floor, gaze forward",
    "Hold the pose — each second of good form counts",
  ]

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/exercises">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Warrior Pose</h1>
        <p className="text-neutral-400">
          Build stability and strength. AI tracks your hold time and flags form errors — runs entirely in your browser.
        </p>
      </div>

      {err && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{err}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-4">
          <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">

            {!running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-20 bg-neutral-900">
                {!ready ? (
                  <>
                    <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <p>Loading pose model…</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-12 w-12 mb-4" />
                    <p>Camera off — click Start to begin</p>
                  </>
                )}
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline muted className="hidden" />

            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover absolute inset-0 ${running ? 'block' : 'hidden'}`}
            />

            {running && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-1 z-30">
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Hold Reps:</span>
                  <span className="text-2xl font-bold ml-2">{stats.reps}</span>
                </div>
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Front Knee:</span>
                  <span className="text-lg ml-2">{stats.angle}°</span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Hold frames: <span className="text-white">{stateRef.current.holdFrames}</span>
                </div>
              </div>
            )}

            {stats.feedback && (
              <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-sm rounded-lg p-3 text-white text-center z-30 ${
                stats.feedback.startsWith('✓') ? 'bg-green-600/80' : 'bg-red-500/80'
              }`}>
                {stats.feedback}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            {!running ? (
              <Button onClick={start} disabled={!ready} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Play className="h-4 w-4 mr-2" />
                {ready ? 'Start' : 'Loading model…'}
              </Button>
            ) : (
              <Button onClick={stop} className="bg-red-500 hover:bg-red-600 text-white">
                <Square className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            <Button onClick={reset} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>

          {/* Session summary */}
          {summary && !running && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-white font-semibold mb-3">Session Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-400">{summary.peakReps}</p>
                  <p className="text-xs text-neutral-400 mt-1">Hold Reps</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{summary.peakHold}</p>
                  <p className="text-xs text-neutral-400 mt-1">Peak Hold Frames</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-300">{summary.total}</p>
                  <p className="text-xs text-neutral-400 mt-1">Frames</p>
                </div>
              </div>
              <Button
                onClick={() => downloadLog('warrior-pose', JSON.parse(localStorage.getItem('warrior-pose-session-log') ?? '[]'))}
                variant="outline"
                className="w-full mt-4 border-white/20 text-white hover:bg-white/10 text-sm"
              >
                <Download className="h-4 w-4 mr-2" /> Download Session JSON
              </Button>
            </div>
          )}
        </Card>

        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Instructions</h2>
          </div>
          <ol className="space-y-4">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm text-white font-medium">
                  {i + 1}
                </span>
                <span className="text-neutral-300">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>• Good side-on lighting helps</li>
              <li>• Keep full body in frame</li>
              <li>• Each 30-frame hold = 1 rep</li>
              <li>• No backend needed — runs in browser</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
