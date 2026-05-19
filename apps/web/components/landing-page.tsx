'use client'

import { SplineScene } from "@workspace/ui/components/splite";
import { Card } from "@workspace/ui/components/card"
import { Spotlight } from "@workspace/ui/components/spotlight"
import { Button } from "@workspace/ui/components/button"
import { LogIn, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRef, useCallback } from "react"

export function LandingPage() {
  const cardRef   = useRef<HTMLDivElement>(null)
  const blobRef   = useRef<HTMLDivElement>(null)
  const coreRef   = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect || !blobRef.current || !coreRef.current) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    blobRef.current.style.left = `${x}px`
    blobRef.current.style.top  = `${y}px`
    blobRef.current.style.opacity = '1'
    coreRef.current.style.left = `${x}px`
    coreRef.current.style.top  = `${y}px`
    coreRef.current.style.opacity = '1'
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (blobRef.current) blobRef.current.style.opacity = '0'
    if (coreRef.current) coreRef.current.style.opacity = '0'
  }, [])

  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      {/* Header */}
      <header className="w-full flex justify-between items-center p-6">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          revivAl
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-white text-black hover:bg-white/90">
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-[500px] relative"
        >
          <Card className="w-full h-full bg-black/[0.96] relative overflow-hidden border-white/10">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            {/* Cursor slime blob */}
            <div
              ref={blobRef}
              className="pointer-events-none absolute z-20"
              style={{
                left: -200,
                top: -200,
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 40%, transparent 70%)',
                filter: 'blur(8px)',
                transition: 'opacity 0.3s',
              }}
            />
            {/* Inner bright core */}
            <div
              ref={coreRef}
              className="pointer-events-none absolute z-20"
              style={{
                left: -200,
                top: -200,
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                filter: 'blur(4px)',
                transition: 'opacity 0.3s',
              }}
            />

            <div className="flex h-full">
              {/* Left content */}
              <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                  Recover Your Body. Sharpen Your Mind.
                </h1>
              </div>

              {/* Right content — Spline robot */}
              <div className="flex-1 relative">
                <SplineScene
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
