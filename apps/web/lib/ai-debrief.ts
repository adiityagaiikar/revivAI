export type ExerciseTelemetrySample = {
  timestamp: number
  angle?: number
  reps?: number
  holdFrames?: number
  feedback?: string
  stage?: string
  wallTime?: number
}

export type AIDebriefPayload = {
  exerciseType: string
  totalReps: number
  averageFormScore: number
  failurePoints: string[]
  duration: number
  samples: ExerciseTelemetrySample[]
}

export const AI_DEBRIEF_FALLBACK =
  'I could not generate a personalized AI debrief right now. You still completed a tracked session, so keep the movement controlled and repeat the workout when you are ready.'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function scoreFromAngle(angle: number, target: number, spread = 1.2) {
  return clamp(100 - Math.abs(angle - target) * spread, 35, 100)
}

function scoreSample(exerciseType: string, sample: ExerciseTelemetrySample) {
  const normalizedType = exerciseType.toLowerCase()
  const feedback = sample.feedback?.trim() ?? ''

  if (feedback.startsWith('✓')) return 100

  const angle = typeof sample.angle === 'number' ? sample.angle : undefined
  const holdFrames = typeof sample.holdFrames === 'number' ? sample.holdFrames : 0

  if (normalizedType.includes('push')) {
    if (sample.stage === 'down' && angle !== undefined) return scoreFromAngle(angle, 95)
    if (sample.stage === 'up' && angle !== undefined) return angle >= 150 ? 92 : scoreFromAngle(angle, 150, 0.9)
    if (angle !== undefined) return scoreFromAngle(angle, 120)
  }

  if (normalizedType.includes('squat')) {
    if (sample.stage === 'down' && angle !== undefined) return scoreFromAngle(angle, 90)
    if (sample.stage === 'up' && angle !== undefined) return angle >= 160 ? 92 : scoreFromAngle(angle, 160, 0.9)
    if (angle !== undefined) return scoreFromAngle(angle, 115)
  }

  if (normalizedType.includes('lunge')) {
    if (angle !== undefined) return scoreFromAngle(angle, 90)
  }

  if (normalizedType.includes('warrior') || normalizedType.includes('pose')) {
    if (holdFrames > 0) return clamp(72 + holdFrames * 0.6, 35, 100)
    if (angle !== undefined) return scoreFromAngle(angle, 90)
  }

  if (angle !== undefined) return scoreFromAngle(angle, 100)
  if (holdFrames > 0) return clamp(60 + holdFrames * 0.5, 35, 100)

  return 70
}

function collectFailurePoints(samples: ExerciseTelemetrySample[]) {
  const points = samples
    .map((sample) => sample.feedback?.trim())
    .filter((feedback): feedback is string => typeof feedback === 'string' && feedback.length > 0 && !feedback.startsWith('✓'))

  return Array.from(new Set(points)).slice(0, 4)
}

function deriveTotalReps(samples: ExerciseTelemetrySample[], fallback = 0) {
  const reportedReps = samples
    .map((sample) => sample.reps)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  return reportedReps.length > 0 ? Math.max(...reportedReps) : fallback
}

export function buildAIDebriefPayload(
  exerciseType: string,
  samples: ExerciseTelemetrySample[],
  fallbackReps = 0,
): AIDebriefPayload {
  const usableSamples = samples.filter((sample): sample is ExerciseTelemetrySample => Boolean(sample))
  const duration = usableSamples.length > 1
    ? Math.max(0, Math.round((usableSamples[usableSamples.length - 1].timestamp - usableSamples[0].timestamp) / 1000))
    : 0

  const averageFormScore = usableSamples.length > 0
    ? Math.round(usableSamples.reduce((total, sample) => total + scoreSample(exerciseType, sample), 0) / usableSamples.length)
    : 0

  return {
    exerciseType,
    totalReps: deriveTotalReps(usableSamples, fallbackReps),
    averageFormScore,
    failurePoints: collectFailurePoints(usableSamples),
    duration,
    samples: usableSamples.slice(-25),
  }
}

export async function requestAIDebrief(payload: AIDebriefPayload) {
  try {
    const response = await fetch('/api/ai/debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)
    if (typeof data?.debrief === 'string' && data.debrief.trim()) {
      return { debrief: data.debrief as string, source: data?.source ?? 'gemini' }
    }

    return { debrief: AI_DEBRIEF_FALLBACK, source: 'fallback' }
  } catch {
    return { debrief: AI_DEBRIEF_FALLBACK, source: 'fallback' }
  }
}