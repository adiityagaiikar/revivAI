'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Activity, Play, Square, RotateCcw, ArrowLeft, VideoOff, Download, Mic } from "lucide-react"
import Link from "next/link"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { ElevenLabsVoiceChat } from "@/components/elevenlabs-voice-chat"

const AGENT_ID = "agent_5201kndzmwmmew99xsex4237d84t"

// ── Landmark indices (MediaPipe BlazePose 33-point) ───────────────────────────
const L_SHOULDER = 11, L_ELBOW = 13, L_WRIST = 15
const R_SHOULDER = 12, R_ELBOW = 14, R_WRIST = 16

// ── Thresholds ────────────────────────────────────────────────────────────────
const ANGLE_SMOOTH       = 0.40
const MIN_VIS            = 0.45
const EXTENDED_THRESHOLD = 160   // reset milestones when arm straightens above this
const FLEXED_THRESHOLD   = 100   // "full flexion" feedback below this

// ── Types ─────────────────────────────────────────────────────────────────────
type SessionEntry = { timestamp: number; wallTime: number; angle: number; score: number }

type Milestones = { m150: boolean; m120: boolean; m90: boolean; m60: boolean }

// ── Utilities ─────────────────────────────────────────────────────────────────
function calcAngle(a: number[], b: number[], c: number[]): number {
  const ab = [a[0] - b[0], a[1] - b[1]]
  const cb = [c[0] - b[0], c[1] - b[1]]
  const dot = ab[0] * cb[0] + ab[1] * cb[1]
  const mag = Math.sqrt(ab[0] ** 2 + ab[1] ** 2) * Math.sqrt(cb[0] ** 2 + cb[1] ** 2)
  return (Math.acos(Math.min(Math.max(dot / (mag || 1), -1), 1)) * 180) / Math.PI
}

// Milestone-based scoring matching your hand_bend.py logic:
// 180=0, 150=30, 120=60, 90=90, 60=100
function calcScore(angle: number): number {
  if (angle >= 180) return 0
  if (angle >= 150) return Math.round((180 - angle) * 1.0)
  if (angle >= 120) return Math.round(30 + (150 - angle) * 2.0)
  if (angle >= 90)  return Math.round(60 + (120 - angle) * 1.0)
  if (angle >= 60)  return Math.round(90 + (90 - angle) * (10 / 30))
  return 100
}

function downloadLog(log: SessionEntry[]) {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `hand-folding-session-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HandFoldingPage() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef        = useRef<number>(0)
  const sessionLogRef = useRef<SessionEntry[]>([])

  // Mutable state kept in ref to avoid stale closures in RAF loop
  const stateRef = useRef<{
    smoothed: number
    score: number
    milestones: Milestones
  }>({
    smoothed: 0,
    score: 0,
    milestones: { m150: false, m120: false, m90: false, m60: false },
  })

  const [ready,      setReady]      = useState(false)
  const [running,    setRunning]    = useState(false)
  const [stats,      setStats]      = useState({ angle: 0, score: 0, feedback: '' })
  const [err,        setErr]        = useState('')
  const [summary,    setSummary]    = useState<{ total: number; peakScore: number; minAngle: number } | null>(null)
  // Each element = one completed session's average
  type SessionAvg = { session: number; avgAngle: number; totalScore: number; date: string }
  const [sessionHistory, setSessionHistory] = useState<SessionAvg[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('hand-folding-session-history') ?? '[]') } catch { return [] }
  })
  const [scorePopup, setScorePopup] = useState<string | null>(null)
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)

  // ── Load MediaPipe model once on mount ──────────────────────────────────────
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

  // ── Camera helpers ──────────────────────────────────────────────────────────
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

  // ── Detection loop ──────────────────────────────────────────────────────────
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

    // Draw mirrored video frame
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    const results = pl.detectForVideo(video, performance.now())
    const s = stateRef.current
    let feedback = ''

    if (results.landmarks.length > 0) {
      const lm  = results.landmarks[0]
      const vis = (i: number) => lm[i]?.visibility ?? 0
      const pt  = (i: number) => [lm[i].x, lm[i].y]

      const leftOk  = Math.min(vis(L_SHOULDER), vis(L_ELBOW), vis(L_WRIST)) >= MIN_VIS
      const rightOk = Math.min(vis(R_SHOULDER), vis(R_ELBOW), vis(R_WRIST)) >= MIN_VIS

      let rawAngle = 0
      if (leftOk && rightOk) {
        rawAngle = (calcAngle(pt(L_SHOULDER), pt(L_ELBOW), pt(L_WRIST)) +
                    calcAngle(pt(R_SHOULDER), pt(R_ELBOW), pt(R_WRIST))) / 2
      } else if (leftOk) {
        rawAngle = calcAngle(pt(L_SHOULDER), pt(L_ELBOW), pt(L_WRIST))
      } else if (rightOk) {
        rawAngle = calcAngle(pt(R_SHOULDER), pt(R_ELBOW), pt(R_WRIST))
      }

      if (rawAngle > 0) {
        s.smoothed = s.smoothed
          ? ANGLE_SMOOTH * rawAngle + (1 - ANGLE_SMOOTH) * s.smoothed
          : rawAngle
      }

      const a = s.smoothed

      // ── Milestone scoring (cumulative per rep, resets on arm extension) ──
      let gained = 0
      if (a <= 60  && !s.milestones.m60)  { s.milestones.m60  = true; s.score += 100; gained = 100 }
      else if (a <= 90  && !s.milestones.m90)  { s.milestones.m90  = true; s.score += 90;  gained = 90  }
      else if (a <= 120 && !s.milestones.m120) { s.milestones.m120 = true; s.score += 60;  gained = 60  }
      else if (a <= 150 && !s.milestones.m150) { s.milestones.m150 = true; s.score += 30;  gained = 30  }

      // Cap total score at 2000
      if (s.score > 2000) s.score = 2000

      if (gained > 0) {
        setScorePopup(`+${gained} pts`)
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
        popupTimerRef.current = setTimeout(() => setScorePopup(null), 1500)
      }

      // Reset milestones when arm straightens
      if (a > EXTENDED_THRESHOLD) {
        s.milestones = { m150: false, m120: false, m90: false, m60: false }
      }

      // Feedback
      if (a <= FLEXED_THRESHOLD) {
        feedback = '✓ Full flexion!'
      } else if (a <= 130) {
        feedback = 'Keep bending your elbow'
      } else if (a >= EXTENDED_THRESHOLD) {
        feedback = 'Extend your arm fully to start'
      }

      // Draw skeleton overlay
      const du = new DrawingUtils(ctx)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      du.drawLandmarks(lm, { color: '#00FF00', lineWidth: 2, radius: 4 })
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#00BFFF', lineWidth: 2 })
      ctx.restore()

      // Append to session log — only when score increases
      if (gained > 0) {
        sessionLogRef.current.push({
          timestamp: performance.now(),
          wallTime: Date.now(),
          angle: Math.round(a),
          score: s.score,
        })
      }
    }

    // Snap angle to nearest 20° bucket for display (e.g. 50-70 → 60)
    const displayAngle = Math.round(s.smoothed / 20) * 20
    setStats({ angle: displayAngle, score: s.score, feedback })
    rafRef.current = requestAnimationFrame(detect)
  }, [])

  // ── Start / Stop / Reset ────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setErr('')
    setSummary(null)
    sessionLogRef.current = []
    stateRef.current = { smoothed: 0, score: 0, milestones: { m150: false, m120: false, m90: false, m60: false } }
    setStats({ angle: 0, score: 0, feedback: '' })
    await startCamera()
    setRunning(true)
    rafRef.current = requestAnimationFrame(detect)
  }, [startCamera, detect])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
    setScorePopup(null)
    stopCamera()
    setRunning(false)

    // Persist to localStorage
    const log = sessionLogRef.current
    localStorage.setItem('hand-folding-session-log', JSON.stringify(log))

    // Derive summary + store session average for graph
    if (log.length > 0) {
      const peakScore = Math.max(...log.map(e => e.score))
      const minAngle  = Math.min(...log.map(e => e.angle))
      const avgAngle  = Math.round(log.reduce((s, e) => s + e.angle, 0) / log.length)
      setSummary({ total: log.length, peakScore, minAngle })

      setSessionHistory(prev => {
        const next = [...prev, {
          session:    prev.length + 1,
          avgAngle,
          totalScore: peakScore,
          date:       new Date().toLocaleDateString(),
        }]
        localStorage.setItem('hand-folding-session-history', JSON.stringify(next))
        return next
      })
    }
    sessionLogRef.current = []
  }, [stopCamera])

  const reset = useCallback(() => {
    stateRef.current = { smoothed: 0, score: 0, milestones: { m150: false, m120: false, m90: false, m60: false } }
    setStats({ angle: 0, score: 0, feedback: '' })
    setSummary(null)
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
    setScorePopup(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera() }, [stopCamera])

  const instructions = [
    "Stand or sit facing the camera with your arm visible",
    "Start with your arm fully extended (straight)",
    "Slowly bend your elbow, bringing your wrist toward your shoulder",
    "Hold the full bend for a moment at maximum flexion",
    "Slowly extend your arm back to the starting position",
    "Repeat for the desired number of reps",
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/exercises">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Hand Folding (Elbow Flexion)</h1>
        <p className="text-neutral-400">
          Rehabilitation exercise for elbow flexion. AI tracks your angle and scores your range of motion — runs entirely in your browser.
        </p>
      </div>

      {err && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{err}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video / Canvas */}
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-4">
          <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">

            {/* Idle placeholder */}
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

            {/* Live stats overlay */}
            {running && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-1 z-30">
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Angle:</span>
                  <span className="text-2xl font-bold ml-2">{stats.angle}°</span>
                </div>
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Score:</span>
                  <span className="text-2xl font-bold ml-2 text-blue-400">{stats.score} pts</span>
                </div>
              </div>
            )}

            {/* Feedback overlay */}
            {stats.feedback && running && (
              <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-sm rounded-lg p-3 text-white text-center z-30 ${
                stats.feedback.startsWith('✓') ? 'bg-green-600/80' : 'bg-amber-500/80'
              }`}>
                {stats.feedback}
              </div>
            )}

            {/* Score gained popup — red, centre of video */}
            {scorePopup && running && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <span className="text-red-400 text-5xl font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] animate-bounce">
                  {scorePopup}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
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
            <Button
              onClick={() => setVoiceChatOpen(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Mic className="h-4 w-4 mr-2" /> Voice Coach
            </Button>
          </div>

          {/* Session summary */}
          {summary && !running && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-white font-semibold mb-3">Session Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-400">{summary.peakScore}</p>
                  <p className="text-xs text-neutral-400 mt-1">Peak Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{summary.minAngle}°</p>
                  <p className="text-xs text-neutral-400 mt-1">Min Angle</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-300">{summary.total}</p>
                  <p className="text-xs text-neutral-400 mt-1">Milestones Hit</p>
                </div>
              </div>
              <Button
                onClick={() => downloadLog(JSON.parse(localStorage.getItem('hand-folding-session-log') ?? '[]'))}
                variant="outline"
                className="w-full mt-4 border-white/20 text-white hover:bg-white/10 text-sm"
              >
                <Download className="h-4 w-4 mr-2" /> Download Session JSON
              </Button>
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Instructions</h2>
          </div>

          {/* Exercise demo GIF */}
          <div className="relative w-full mb-5 rounded-lg overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center" style={{ minHeight: '180px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i0.wp.com/post.healthline.com/wp-content/uploads/2021/07/400x400_Biceps_Workout_At_Home_Wide_Lifted_Bicep_Curl.gif?h=840"
              alt="Elbow flexion animation"
              className="w-full object-contain"
              style={{ maxHeight: '200px' }}
            />
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-semibold tracking-wider text-white pointer-events-none">
              DEMO
            </div>
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
            <h3 className="text-sm font-medium text-white mb-3">Scoring Guide</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-neutral-400">≤ 150° bend</span>
                <span className="text-white font-medium">+30 pts</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-400">≤ 120° bend</span>
                <span className="text-white font-medium">+60 pts</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-400">≤ 90° bend</span>
                <span className="text-white font-medium">+90 pts</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-400">≤ 60° bend</span>
                <span className="text-white font-medium">+100 pts</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>• Face camera side-on for best accuracy</li>
              <li>• Keep your full arm in frame</li>
              <li>• Ensure good lighting</li>
              <li>• Session data saved automatically on stop</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Session Performance Graph */}
      {sessionHistory.length > 0 && (
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <h3 className="text-white font-semibold mb-1">Session History</h3>
          <p className="text-xs text-neutral-400 mb-4">Average angle and peak score across all sessions</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={sessionHistory}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="session"
                stroke="#555"
                fontSize={12}
                tickFormatter={(v) => `S${v}`}
                label={{ value: 'Session', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }}
              />
              <YAxis yAxisId="score" stroke="#3b82f6" fontSize={12} domain={[0, 2000]} />
              <YAxis yAxisId="angle" orientation="right" stroke="#22c55e" fontSize={12} domain={[0, 180]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: 12 }}
                formatter={(val: any, name: any) => [
                  name === 'totalScore' ? `${val} pts` : `${val}°`,
                  name === 'totalScore' ? 'Peak Score' : 'Avg Angle'
                ]}
                labelFormatter={(l) => `Session ${l}`}
              />
              <Legend
                formatter={(val) => val === 'totalScore' ? 'Peak Score (pts)' : 'Avg Angle (°)'}
                wrapperStyle={{ fontSize: 12, color: '#aaa' }}
              />
              <Line yAxisId="score" type="monotone" dataKey="totalScore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
              <Line yAxisId="angle" type="monotone" dataKey="avgAngle"   stroke="#22c55e" strokeWidth={2} dot={{ r: 5, fill: '#22c55e' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <ElevenLabsVoiceChat
        agentId={AGENT_ID}
        active={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
      />
    </div>
  )
}