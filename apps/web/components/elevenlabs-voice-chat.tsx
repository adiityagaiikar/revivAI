'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'

const SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed'

type ElevenLabsVoiceChatProps = {
  agentId: string
  active: boolean
  onClose: () => void
}

/**
 * Loads the ElevenLabs ConvAI web component and mounts it when `active` is true.
 * Script is loaded on first open; the widget is placed in a fixed panel.
 */
export function ElevenLabsVoiceChat({ agentId, active, onClose }: ElevenLabsVoiceChatProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (!active || !scriptLoaded || !hostRef.current) return

    const host = hostRef.current
    host.replaceChildren()

    const el = document.createElement('elevenlabs-convai')
    el.setAttribute('agent-id', agentId)
    host.appendChild(el)

    return () => {
      host.replaceChildren()
    }
  }, [active, scriptLoaded, agentId])

  if (!active) return null

  return (
    <>
      <Script
        id="elevenlabs-convai-widget"
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div
        className="fixed bottom-6 right-6 z-[200] flex max-w-[min(100vw-2rem,420px)] flex-col gap-3 rounded-2xl border border-white/15 bg-black/95 p-4 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-label="Voice assistant"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">NeuroSync voice assistant</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-neutral-400 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close voice chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {!scriptLoaded && (
          <p className="text-xs text-neutral-400">Loading voice assistant…</p>
        )}
        <div
          ref={hostRef}
          className="min-h-[120px] w-full [&_elevenlabs-convai]:block"
        />
      </div>
    </>
  )
}
