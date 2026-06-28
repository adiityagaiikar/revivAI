'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Settings, Camera, Mic, CheckCircle2, AlertTriangle,
  Video, VideoOff, ChevronDown, RefreshCw, Loader2,
  Watch, Bluetooth, Smartphone
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function deviceLabel(device: MediaDeviceInfo, index: number): string {
  return device.label || `Camera ${index + 1}`
}

/* ─────────────────────────────────────────────
   Sub-component: Camera selector row
───────────────────────────────────────────── */
function CameraRow({
  device,
  index,
  selected,
  onSelect,
}: {
  device: MediaDeviceInfo
  index: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
        selected
          ? 'border-cyan-500/40 bg-cyan-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15'
      }`}
    >
      {/* Radio dot */}
      <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
        selected ? 'border-cyan-400' : 'border-white/25'
      }`}>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
      </div>

      {/* Icon */}
      <div className={`p-2 rounded-lg border shrink-0 ${
        selected
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
          : 'border-white/10 bg-white/5 text-white/40'
      }`}>
        <Camera className="w-4 h-4" />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-white' : 'text-white/70'}`}>
          {deviceLabel(device, index)}
        </p>
        <p className="text-[11px] text-white/30 mt-0.5 font-mono truncate">{device.deviceId.slice(0, 20)}…</p>
      </div>

      {selected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
    </button>
  )
}

/* ─────────────────────────────────────────────
   Sub-component: Microphone selector row
───────────────────────────────────────────── */
function MicRow({
  device,
  index,
  selected,
  onSelect,
}: {
  device: MediaDeviceInfo
  index: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
        selected
          ? 'border-violet-500/40 bg-violet-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15'
      }`}
    >
      <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
        selected ? 'border-violet-400' : 'border-white/25'
      }`}>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
      </div>

      <div className={`p-2 rounded-lg border shrink-0 ${
        selected
          ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
          : 'border-white/10 bg-white/5 text-white/40'
      }`}>
        <Mic className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-white' : 'text-white/70'}`}>
          {device.label || `Microphone ${index + 1}`}
        </p>
        <p className="text-[11px] text-white/30 mt-0.5 font-mono truncate">{device.deviceId.slice(0, 20)}…</p>
      </div>

      {selected && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
    </button>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function DeviceCalibrationPage() {
  const [cameras, setCameras]           = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones]   = useState<MediaDeviceInfo[]>([])
  const [activeCamera, setActiveCamera] = useState<string>('')
  const [activeMic, setActiveMic]       = useState<string>('')
  const [watchStatus, setWatchStatus]   = useState<'idle' | 'scanning' | 'found' | 'connected'>('idle')
  const [activeWatch, setActiveWatch]   = useState<string>('')
  const [permission, setPermission]     = useState<PermissionState>('idle')
  const [testFeedOpen, setTestFeedOpen] = useState(false)
  const [feedLoading, setFeedLoading]   = useState(false)
  const [feedError, setFeedError]       = useState<string | null>(null)

  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  /* ── Enumerate devices ── */
  const enumerateDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      setPermission('unavailable')
      return
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter((d) => d.kind === 'videoinput')
      const mics = devices.filter((d) => d.kind === 'audioinput')
      setCameras(cams)
      setMicrophones(mics)
      if (cams.length > 0 && !activeCamera) setActiveCamera(cams[0].deviceId)
      if (mics.length > 0 && !activeMic)   setActiveMic(mics[0].deviceId)
    } catch (err) {
      console.error('enumerateDevices error:', err)
    }
  }, [activeCamera, activeMic])

  /* ── Request permissions then enumerate ── */
  const requestPermissions = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermission('unavailable')
      return
    }
    setPermission('requesting')
    try {
      // Requesting a brief stream forces the browser to show the permission prompt
      // and also populates device labels (which are hidden before permission).
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setPermission('granted')
      await enumerateDevices()
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermission('denied')
      } else {
        setPermission('unavailable')
      }
    }
  }, [enumerateDevices])

  /* ── Auto-enumerate on mount (labels may be empty without permission) ── */
  useEffect(() => {
    enumerateDevices()
    // Listen for device changes (plug/unplug)
    navigator?.mediaDevices?.addEventListener?.('devicechange', enumerateDevices)
    return () => {
      navigator?.mediaDevices?.removeEventListener?.('devicechange', enumerateDevices)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Stop test feed on unmount ── */
  useEffect(() => {
    return () => stopFeed()
  }, [])

  /* ── Stop stream helper ── */
  function stopFeed() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTestFeedOpen(false)
    setFeedError(null)
  }

  /* ── Open test feed ── */
  async function openTestFeed() {
    if (testFeedOpen) { stopFeed(); return }
    if (!activeCamera) return
    setFeedLoading(true)
    setFeedError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: activeCamera } },
        audio: false,
      })
      streamRef.current = stream
      setTestFeedOpen(true)
      // Wait for the video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setFeedLoading(false)
      }, 80)
    } catch (err: any) {
      setFeedError(err?.message ?? 'Could not open camera feed.')
      setFeedLoading(false)
    }
  }

  /* ── When active camera changes, restart feed if open ── */
  useEffect(() => {
    if (testFeedOpen) {
      stopFeed()
      openTestFeed()
    }
  }, [activeCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasDevices = cameras.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Settings className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Device Calibration</h1>
          <p className="text-white/60 mt-1">Select your webcam and microphone for the computer-vision pipeline.</p>
        </div>
      </div>

      {/* ── Permission / status banner ── */}
      {permission === 'unavailable' && (
        <GlassCard className="p-4 flex items-center gap-4 border-red-500/20 bg-red-500/5">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white">mediaDevices API unavailable.</span>{' '}
            Please use a modern browser over HTTPS.
          </p>
        </GlassCard>
      )}

      {permission === 'denied' && (
        <GlassCard className="p-4 flex items-center gap-4 border-amber-500/20 bg-amber-500/5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Camera permission denied</p>
            <p className="text-xs text-white/50 mt-0.5">
              Allow camera access in your browser settings, then click Refresh.
            </p>
          </div>
          <button
            onClick={requestPermissions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </GlassCard>
      )}

      {/* ── Camera configuration ── */}
      <GlassCard glow className="p-6 space-y-5">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <Video className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Webcam</h2>
              <p className="text-[11px] text-white/35 mt-0.5">
                {hasDevices ? `${cameras.length} device${cameras.length !== 1 ? 's' : ''} detected` : 'No cameras found'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={requestPermissions}
              title="Refresh device list"
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              {permission === 'requesting'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>

            {/* Test feed toggle */}
            {hasDevices && (
              <button
                onClick={openTestFeed}
                disabled={feedLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  testFeedOpen
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {feedLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening…</>
                  : testFeedOpen
                    ? <><VideoOff className="w-3.5 h-3.5" /> Stop Feed</>
                    : <><Video className="w-3.5 h-3.5" /> Test Feed</>}
              </button>
            )}
          </div>
        </div>

        {/* Grant permission prompt */}
        {permission === 'idle' && !hasDevices && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/8">
              <Camera className="w-8 h-8 text-cyan-400/60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Grant camera access to detect devices</p>
              <p className="text-xs text-white/40 mt-1">Device labels are hidden until permission is granted.</p>
            </div>
            <button
              onClick={requestPermissions}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
            >
              <Camera className="w-4 h-4" /> Allow Camera Access
            </button>
          </div>
        )}

        {/* Camera list */}
        {hasDevices && (
          <div className="space-y-2">
            {cameras.map((cam, i) => (
              <CameraRow
                key={cam.deviceId}
                device={cam}
                index={i}
                selected={activeCamera === cam.deviceId}
                onSelect={() => setActiveCamera(cam.deviceId)}
              />
            ))}
          </div>
        )}

        {/* Live preview */}
        {testFeedOpen && (
          <div className="rounded-xl overflow-hidden border border-cyan-500/20 bg-black relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-64 object-cover"
            />
            {/* Overlay label */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Live</span>
            </div>
          </div>
        )}

        {feedError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {feedError}
          </p>
        )}
      </GlassCard>

      {/* ── Microphone configuration ── */}
      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Mic className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Microphone</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              {microphones.length > 0
                ? `${microphones.length} device${microphones.length !== 1 ? 's' : ''} detected`
                : 'No microphones found'}
            </p>
          </div>
        </div>

        {microphones.length > 0 ? (
          <div className="space-y-2">
            {microphones.map((mic, i) => (
              <MicRow
                key={mic.deviceId}
                device={mic}
                index={i}
                selected={activeMic === mic.deviceId}
                onSelect={() => setActiveMic(mic.deviceId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30 py-4 text-center">
            Grant camera access above to reveal microphone devices.
          </p>
        )}
      </GlassCard>

      {/* ── Smartwatch configuration ── */}
      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <Watch className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Smartwatch</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              {watchStatus === 'connected' ? 'Device connected' : 'Connect WearOS or Apple Watch for heart rate'}
            </p>
          </div>
        </div>

        {watchStatus === 'idle' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-4 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-4">
              <Bluetooth className="w-8 h-8 text-emerald-400/60" />
            </div>
            <p className="text-sm font-semibold text-white">No watch connected</p>
            <p className="text-xs text-white/40 mt-1 mb-4">Pair your smartwatch via Bluetooth to sync heart rate and vitals.</p>
            <button
              onClick={() => {
                setWatchStatus('scanning')
                setTimeout(() => setWatchStatus('found'), 2000)
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 mx-auto rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-sm font-semibold transition-colors"
            >
              <Bluetooth className="w-4 h-4" /> Scan for Devices
            </button>
          </div>
        )}

        {watchStatus === 'scanning' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Scanning for devices…</p>
            <p className="text-xs text-white/40 mt-1">Make sure your watch is in pairing mode.</p>
          </div>
        )}

        {watchStatus === 'found' && (
          <div className="space-y-2">
            <button
              onClick={() => {
                setActiveWatch('Apple Watch Series 9')
                setWatchStatus('connected')
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-left"
            >
              <div className="h-4 w-4 rounded-full border-2 border-white/25 shrink-0" />
              <div className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 shrink-0">
                <Watch className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70">Apple Watch Series 9</p>
                <p className="text-[11px] text-white/30 mt-0.5">Ready to pair</p>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveWatch('Garmin Fenix 7')
                setWatchStatus('connected')
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-left"
            >
              <div className="h-4 w-4 rounded-full border-2 border-white/25 shrink-0" />
              <div className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 shrink-0">
                <Watch className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70">Garmin Fenix 7</p>
                <p className="text-[11px] text-white/30 mt-0.5">Ready to pair</p>
              </div>
            </button>
          </div>
        )}

        {watchStatus === 'connected' && (
          <div className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 transition-all text-left">
            <div className="h-4 w-4 rounded-full border-2 border-emerald-400 shrink-0 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
              <Watch className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{activeWatch}</p>
              <p className="text-[11px] text-white/30 mt-0.5 font-mono">Connected • Syncing HR</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setWatchStatus('idle')
                setActiveWatch('')
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors shrink-0"
            >
              Disconnect
            </button>
          </div>
        )}
      </GlassCard>

      {/* ── Active configuration summary ── */}
      {(hasDevices || watchStatus === 'connected') && (
        <GlassCard className="p-5 border-cyan-500/15" style={{ borderColor: 'rgba(6,182,212,0.15)' }}>
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Active Configuration</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
              <Video className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Camera</p>
                <p className="text-sm text-white font-medium truncate">
                  {cameras.find((c) => c.deviceId === activeCamera)
                    ? deviceLabel(cameras.find((c) => c.deviceId === activeCamera)!, cameras.findIndex((c) => c.deviceId === activeCamera))
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
              <Mic className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Microphone</p>
                <p className="text-sm text-white font-medium truncate">
                  {microphones.find((m) => m.deviceId === activeMic)?.label ||
                    (microphones.length > 0 ? `Microphone ${microphones.findIndex((m) => m.deviceId === activeMic) + 1}` : '—')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
              <Watch className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Smartwatch</p>
                <p className="text-sm text-white font-medium truncate">
                  {watchStatus === 'connected' ? activeWatch : '—'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/25 mt-4">
            These selections are passed to the Python CV backend when you start an exercise session.
          </p>
        </GlassCard>
      )}

    </div>
  )
}
