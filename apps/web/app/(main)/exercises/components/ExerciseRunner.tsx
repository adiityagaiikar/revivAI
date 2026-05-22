'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Activity, Play, Square, RotateCcw, ArrowLeft, Video, VideoOff } from "lucide-react"
import Link from "next/link"
import { usePatientPlan, isExerciseAllowed } from '@/hooks/usePatientPlan'

interface ExerciseDetailProps {
  exerciseName: string
  exerciseId: string
  description: string
  instructions: string[]
}

export default function ExerciseRunner({ 
  exerciseName, 
  exerciseId, 
  description,
  instructions 
}: ExerciseDetailProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ reps: 0, angle: 0, error: '' })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [frameSrc, setFrameSrc] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const { plan, loading: planLoading } = usePatientPlan()

  // Handle video stream changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    video.srcObject = stream

    // onloadedmetadata fires when metadata is ready; also call play() directly
    // in case metadata was already loaded before this effect ran.
    const tryPlay = () => {
      video.play().catch(err => console.error('Video play error:', err))
    }

    if (video.readyState >= 1) {
      // Metadata already available — play immediately
      tryPlay()
    } else {
      video.onloadedmetadata = tryPlay
    }

    return () => {
      video.onloadedmetadata = null
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }
      })
      
      setStream(mediaStream)
      setError('')
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions to use this feature.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startExercise = () => {
    if (!stream) {
      startCamera()
      return
    }
    
    setIsLoading(true)
    setIsRunning(true)
    
    // Connect to FastAPI WebSocket for real-time analysis
    const ws = new WebSocket(`ws://localhost:8000/ws/${exerciseId}`)
    
    let isProcessing = false;
    let animationFrameId: number;

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && ws.readyState === WebSocket.OPEN && !isProcessing) {
        isProcessing = true;
        const video = videoRef.current
        const canvas = canvasRef.current
        // Send a lightweight medium-resolution base64 for fastest transport and stable accuracy
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          ws.send(dataUrl)
        }
      }
      animationFrameId = requestAnimationFrame(processFrame)
    }

    ws.onopen = () => {
      setIsLoading(false)
      // Kick off processing loop
      processFrame()
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.frame) {
        setFrameSrc(`data:image/jpeg;base64,${data.frame}`)
      }
      setStats({
        reps: data.rep_count || 0,
        angle: data.angle || 0,
        error: data.error || ''
      })
      // Lift the throttle lock allowing next frame grab natively
      isProcessing = false;
    }
    
    ws.onerror = () => {
      setError('Connection to analysis server failed. Please ensure FastAPI server is running.')
      setIsRunning(false)
      setIsLoading(false)
      cancelAnimationFrame(animationFrameId)
    }
    
    ws.onclose = () => {
      setIsRunning(false)
      setFrameSrc(null)
      cancelAnimationFrame(animationFrameId)
    }
    
    wsRef.current = ws
  }

  const stopExercise = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setIsRunning(false)
    setIsLoading(false)
  }

  const resetExercise = () => {
    setStats({ reps: 0, angle: 0, error: '' })
  }

  useEffect(() => {
    return () => {
      stopCamera()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  if (planLoading) {
    return (
      <div className="space-y-6 py-12 text-center text-neutral-400">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p>Loading your care plan…</p>
      </div>
    )
  }

  if (!isExerciseAllowed(exerciseId, plan)) {
    return (
      <div className="space-y-6">
        <Card className="bg-black/[0.96] border-white/10 p-8 max-w-lg mx-auto text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Not assigned to your plan</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Your doctor has personalized your program. This exercise is not part of your current assignments.
          </p>
          <Link href="/exercises">
            <Button className="bg-white text-black hover:bg-white/90">Back to exercises</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <Spotlight className="-top-20 left-0" fill="white" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/exercises">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{exerciseName}</h1>
          <p className="text-neutral-400">{description}</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Main Exercise Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <Card className="lg:col-span-2 bg-black/[0.96] border-white/10 p-4">
          <canvas ref={canvasRef} className="hidden" />
          <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
            
            {/* Show landing placeholder when inactive */}
            {!stream && !frameSrc && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-20 bg-neutral-900">
                {isLoading ? (
                  <>
                    <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <p>Warming up AI engine & camera...</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-12 w-12 mb-4" />
                    <p>Camera is off / Idle</p>
                    <p className="text-sm text-neutral-500 mt-2">Click Preview Local Camera or Start AI Analysis</p>
                  </>
                )}
              </div>
            )}

            {/* Show AI annotated frame when active */}
            {frameSrc && (
              <img 
                src={frameSrc} 
                alt="AI Analysis Feed" 
                className="w-full h-full object-cover transform scale-x-[-1] z-10 bg-black absolute inset-0"
              />
            )}

            {/* Persistent local video for frame extraction. Visible only when previewing camera without AI overlay */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] z-10 absolute inset-0 transition-opacity duration-200 ${!stream || frameSrc ? 'opacity-0' : 'opacity-100'}`}
            />
            
            {/* Stats Overlay */}
            {isRunning && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 space-y-2 z-30">
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Reps:</span>
                  <span className="text-2xl font-bold ml-2">{stats.reps}</span>
                </div>
                <div className="text-white">
                  <span className="text-neutral-400 text-sm">Angle:</span>
                  <span className="text-lg ml-2">{stats.angle}°</span>
                </div>
              </div>
            )}
            
            {/* Error Overlay */}
            {stats.error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-500/80 backdrop-blur-sm rounded-lg p-3 text-white text-center">
                {stats.error}
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {!isRunning ? (
              <>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={isLoading || !!stream}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Preview Camera
                </Button>
                
                <Button
                  onClick={startExercise}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={stopExercise}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            
            <Button
              onClick={resetExercise}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={!isRunning}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            {stream && (
              <Button
                onClick={stopCamera}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <VideoOff className="h-4 w-4 mr-2" />
                Disable Camera
              </Button>
            )}
          </div>
        </Card>

        {/* Instructions Panel */}
        <Card className="bg-black/[0.96] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Instructions</h2>
          </div>
          
          <ol className="space-y-4">
            {instructions.map((instruction, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm text-white font-medium">
                  {index + 1}
                </span>
                <span className="text-neutral-300">{instruction}</span>
              </li>
            ))}
          </ol>
          
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>• Ensure good lighting</li>
              <li>• Position camera at side angle</li>
              <li>• Keep full body in frame</li>
              <li>• Follow the AI feedback</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
