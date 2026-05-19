'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Activity, Play, Square, RotateCcw, ArrowLeft, VideoOff } from "lucide-react"
import Link from "next/link"

// Track knee drive: L_HIP(23)->L_KNEE(25)->L_ANKLE(27)
// Knee driven in: ~60° (range 50–80), Leg extended: ~160° (range 150–170)
const L_HIP = 23, L_KNEE = 25, L_ANKLE = 27
const R_HIP = 24, R_KNEE = 26, R_ANKLE = 28

const EXTENDED_THRESHOLD = 150   // leg extended ≥ 150°
const DRIVEN_THRESHOLD   = 80    // knee driven in ≤ 80°
const GOOD_DRIVE_MIN     = 50
const GOOD_DRIVE_MAX     = 80
const ANGLE_SMOOTH       = 0.35
const MIN_VIS            = 0.45

function calcAngle(a: number[], b: number[], c: number[]) {
  const ab = [a[0] - b[0], a[1] - b[1]]
  const cb = [c[0] - b[0], c[1] - b[1]]
  const dot = ab[0] * cb[0] + ab[1] * cb[1]
  const mag = Math.sqrt(ab[0] ** 2 + ab[1] ** 2) * Math.sqrt(cb[0] ** 2 + cb[1] ** 2)
  return (Math.acos(Math.min(Math.max(dot / (mag || 1), -1), 1)) * 180) / Math.PI
}

export default function MountainClimbersPage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  // Track both legs alternately — rep = one full drive cycle per leg
  const stateRef      = useRef({ stageL: 'ext', stageR: 'ext', smoothedL: 0, smoothedR: 0, reps: 0, started: false })

  const [ready,   setReady]   = useState(false)
  const [running, setRunning] = useState(false)
  const [stats,   setStats]   = useState({ reps: 0, angle: 0, feedback: '' })
  const [err,     setErr]     = useState('')

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
      const lm = results.landmarks[0]
      const vis = (i: number) => lm[i]?.visibility ?? 0
      const pt  = (i: number) => [lm[i].x, lm[i].y]

      const leftOk  = Math.min(vis(L_HIP), vis(L_KNEE), vis(L_ANKLE)) >= MIN_VIS
      const rightOk = Math.min(vis(R_HIP), vis(R_KNEE), vis(R_ANKLE)) >= MIN_VIS

      if (leftOk) {
        const a = calcAngle(pt(L_HIP), pt(L_KNEE), pt(L_ANKLE))
        s.smoothedL = s.smoothedL ? ANGLE_SMOOTH * a + (1 - ANGLE_SMOOTH) * s.smoothedL : a
        if (s.smoothedL <= DRIVEN_THRESHOLD) {
          s.started = true
          if (s.stageL === 'ext') s.stageL = 'drive'
        } else if (s.smoothedL >= EXTENDED_THRESHOLD) {
          if (s.stageL === 'drive') { s.reps++; }
          s.stageL = 'ext'
        }
      }

      if (rightOk) {
        const a = calcAngle(pt(R_HIP), pt(R_KNEE), pt(R_ANKLE))
        s.smoothedR = s.smoothedR ? ANGLE_SMOOTH * a + (1 - ANGLE_SMOOTH) * s.smoothedR : a
        if (s.smoothedR <= DRIVEN_THRESHOLD) {
          s.started = true
          if (s.stageR === 'ext') s.stageR = 'drive'
        } else if (s.smoothedR >= EXTENDED_THRESHOLD) {
          if (s.stageR === 'drive') { s.reps++; }
          s.stageR = 'ext'
        }
      }

      // Show the more active (lower) angle
      const activeAngle = Math.min(
        leftOk  ? s.smoothedL : 999,
        rightOk ? s.smoothedR : 999
      )
      displayAngle = activeAngle === 999 ? 0 : Math.round(activeAngle)

      if (s.started) {
        const inDrive = s.stageL === 'drive' || s.stageR === 'drive'
        if (inDrive) {
          if (activeAngle >= GOOD_DRIVE_MIN && activeAngle <= GOOD_DRIVE_MAX) feedback = '✓ Good knee drive!'
          else if (activeAngle > GOOD_DRIVE_MAX)                              feedback = 'Drive knee closer to chest'
          else                                                                 feedback = '✓ Deep drive — extend!'
        } else {
          feedback = '✓ Drive the next knee in!'
        }
      }

      const du = new DrawingUtils(ctx)
      ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#00FF00', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#00BFFF', lineWidth: 2 })
      ctx.restore()
    }

    setStats({ reps: s.reps, angle: displayAngle, feedback })
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  const start = useCallback(async () => {
    setErr('')
    await startCamera()
    stateRef.current = { stageL: 'ext', stageR: 'ext', smoothedL: 0, smoothedR: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '' })
    setRunning(true)
    rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect])

  const stop = useCallback(() => { cancelAnimationFrame(rafRef.current); stopCamera(); setRunning(false) }, [stopCamera])
  const reset = useCallback(() => {
    stateRef.current = { stageL: 'ext', stageR: 'ext', smoothedL: 0, smoothedR: 0, reps: 0, started: false }
    setStats({ reps: 0, angle: 0, feedback: '' })
  }, [])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  const instructions = [
    "Start in a high plank — hands under shoulders",
    "Keep your body in a straight line, core tight",
    "Drive your right knee toward your chest",
    "Quickly switch — extend right, drive left knee in",
    "Alternate legs in a running motion",
    "Target knee angle: ~60° at full drive",
  ]

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/exercises">
            <Button variant="ghost" className="text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Mountain Climbers</h1>
        <p className="text-neutral-400">Core and cardio combined. AI tracks knee drive angle per leg — runs in your browser.</p>
      </div>

      {err && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-4">
          <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
            {!running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-20 bg-neutral-900">
                {!ready ? (<><div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full" /><p>Loading pose model…</p></>) : (<><VideoOff className="h-12 w-12 mb-4" /><p>Camera off — click Start to begin</p></>)}
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={canvasRef} className={`w-full h-full object-cover absolute inset-0 ${running ? 'block' : 'hidden'}`} />
            {running && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-1 z-30">
                <div className="text-white"><span className="text-neutral-400 text-sm">Reps:</span><span className="text-2xl font-bold ml-2">{stats.reps}</span></div>
                <div className="text-white"><span className="text-neutral-400 text-sm">Knee Angle:</span><span className="text-lg ml-2">{stats.angle}°</span></div>
              </div>
            )}
            {stats.feedback && (
              <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-sm rounded-lg p-3 text-white text-center z-30 ${stats.feedback.startsWith('✓') ? 'bg-green-600/80' : 'bg-red-500/80'}`}>
                {stats.feedback}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            {!running ? (
              <Button onClick={start} disabled={!ready} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Play className="h-4 w-4 mr-2" />{ready ? 'Start' : 'Loading model…'}
              </Button>
            ) : (
              <Button onClick={stop} className="bg-red-500 hover:bg-red-600 text-white"><Square className="h-4 w-4 mr-2" /> Stop</Button>
            )}
            <Button onClick={reset} variant="outline" className="border-white/20 text-white hover:bg-white/10"><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
          </div>
        </Card>

        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20"><Activity className="h-5 w-5 text-purple-400" /></div>
            <h2 className="text-lg font-semibold text-white">Instructions</h2>
          </div>
          <ol className="space-y-4">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm text-white font-medium">{i + 1}</span>
                <span className="text-neutral-300">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>• Side-on camera angle works best</li>
              <li>• Each knee drive = 1 rep</li>
              <li>• Target knee angle: ~60° at drive</li>
              <li>• No backend needed — runs in browser</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
