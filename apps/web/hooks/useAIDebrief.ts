'use client'

import { useCallback, useState } from 'react'
import {
  AI_DEBRIEF_FALLBACK,
  requestAIDebrief,
  type AIDebriefPayload,
} from '@/lib/ai-debrief'

export type AIDebriefStatus = 'idle' | 'loading' | 'ready'

export function useAIDebrief() {
  const [debriefStatus, setDebriefStatus] = useState<AIDebriefStatus>('idle')
  const [debriefText, setDebriefText] = useState('')

  const resetAIDebrief = useCallback(() => {
    setDebriefStatus('idle')
    setDebriefText('')
  }, [])

  const requestDebrief = useCallback(async (payload: AIDebriefPayload) => {
    setDebriefStatus('loading')
    setDebriefText('')

    const result = await requestAIDebrief(payload)
    setDebriefText(result.debrief || AI_DEBRIEF_FALLBACK)
    setDebriefStatus('ready')

    return result.debrief || AI_DEBRIEF_FALLBACK
  }, [])

  return {
    debriefStatus,
    debriefText,
    resetAIDebrief,
    requestDebrief,
  }
}