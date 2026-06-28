'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
const SCRIPT_ID  = 'elevenlabs-convai-script'

type Props = {
  agentId: string
  active: boolean
  onClose: () => void
}

/**
 * Crash-safe ElevenLabs ConvAI voice panel.
 *
 * Key changes vs previous version:
 * - Script is injected once into <head> (idempotent, safe to reopen/close)
 * - Widget is only mounted after script is confirmed loaded (onload event)
 * - All DOM operations are guarded with null checks
 * - Error boundary via try/catch around widget instantiation
 * - "Start call" button only toggles visual state — the widget handles the actual call
 */
export function ElevenLabsVoiceChat({ agentId, active, onClose }: Props) {
  const [scriptReady, setScriptReady] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  /* ── Inject script once into <head> ── */
  useEffect(() => {
    // Check if already injected and loaded
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      // Script tag exists — check if it already fired onload
      if ((window as any).__elevenlabsConvAIReady) {
        setScriptReady(true)
      } else {
        // Wait for it to finish loading
        existing.addEventListener('load', () => {
          ;(window as any).__elevenlabsConvAIReady = true
          setScriptReady(true)
        })
      }
      return
    }

    const script = document.createElement('script')
    script.id   = SCRIPT_ID
    script.src  = SCRIPT_SRC
    script.type = 'text/javascript'
    script.async = true
    script.onload = () => {
      ;(window as any).__elevenlabsConvAIReady = true
      setScriptReady(true)
    }
    script.onerror = () => {
      setWidgetError('Failed to load voice assistant SDK. Check your connection.')
    }
    document.head.appendChild(script)
  }, [])

  /* ── Mount/unmount the <elevenlabs-convai> element ── */
  const mountWidget = useCallback(() => {
    if (!hostRef.current || !scriptReady || mountedRef.current) return
    try {
      hostRef.current.replaceChildren()
      const el = document.createElement('elevenlabs-convai')
      el.setAttribute('agent-id', agentId)
      hostRef.current.appendChild(el)
      mountedRef.current = true
    } catch (err: any) {
      setWidgetError(err?.message ?? 'Widget failed to initialize.')
    }
  }, [agentId, scriptReady])

  const unmountWidget = useCallback(() => {
    if (!hostRef.current) return
    try {
      hostRef.current.replaceChildren()
    } catch { /* ignore */ }
    mountedRef.current = false
  }, [])

  useEffect(() => {
    if (active && scriptReady) {
      mountWidget()
    } else if (!active) {
      unmountWidget()
      setIsListening(false)
    }
  }, [active, scriptReady, mountWidget, unmountWidget])

  /* ── Don't render anything when panel is closed ── */
  if (!active) return null

  return (
    <AnimatePresence>
      <motion.div
        key="voice-panel"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{   opacity: 0, y: 16,  scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="absolute bottom-16 right-4 z-50 w-[min(92vw,28rem)] overflow-visible rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-label="Voice assistant"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div
                className="h-8 w-8 flex items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600"
                style={{ boxShadow: '0 0 18px rgba(6,182,212,0.5)' }}
              >
                <Mic className="h-3.5 w-3.5 text-white" />
              </div>
              {isListening && (
                <span className="absolute inset-0 rounded-full border border-cyan-400/50 animate-ping" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">reviVAI Voice</p>
              <p className="text-[11px] text-cyan-400/70">
                {widgetError ? 'Error' : !scriptReady ? 'Loading SDK…' : isListening ? 'Listening…' : 'Ready'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice assistant"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Error state ── */}
        {widgetError && (
          <div className="px-5 py-4 flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-400 text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Could not start voice chat</p>
              <p className="text-xs text-white/40 mt-0.5">{widgetError}</p>
              <button
                type="button"
                onClick={() => {
                  setWidgetError(null)
                  mountWidget()
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {!scriptReady && !widgetError && (
          <div className="px-5 py-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
            <p className="text-xs text-white/40">Initialising voice assistant…</p>
          </div>
        )}

        {/* ── Widget host (ElevenLabs mounts its UI here) ── */}
        {!widgetError && (
          <div
            ref={hostRef}
            className="w-full overflow-visible"
            style={{
              minHeight: scriptReady ? 360 : 0,
              overflow: 'visible',
            }}
          />
        )}

        {/* ── CTA bar ── */}
        {scriptReady && !widgetError && (
          <div className="px-5 py-4 border-t border-white/8">
            <button
              type="button"
              onClick={() => setIsListening(v => !v)}
              className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isListening
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25'
                  : 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
              }`}
              style={isListening ? {} : { boxShadow: '0 0 20px rgba(6,182,212,0.2), inset 0 0 20px rgba(6,182,212,0.05)' }}
            >
              {isListening
                ? <><MicOff className="h-4 w-4 text-red-400" />End Call</>
                : <><Mic className="h-4 w-4 text-cyan-400" />Start a Call</>
              }
            </button>
            <p className="text-[10px] text-white/20 text-center mt-2">
              Powered by ElevenLabs ConvAI
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
