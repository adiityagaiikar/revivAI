import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FALLBACK_DEBRIEF =
  'I could not generate a personalized coaching summary right now. You still completed the session, so focus on controlled repetitions and cleaner alignment next time.'

type DebriefRequestBody = {
  exerciseType?: string
  totalReps?: number
  averageFormScore?: number
  failurePoints?: string[] | string
  duration?: number
  samples?: unknown
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeFailurePoints(value: DebriefRequestBody['failurePoints']) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export async function POST(request: NextRequest) {
  let body: DebriefRequestBody = {}

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const exerciseType = typeof body.exerciseType === 'string' && body.exerciseType.trim().length > 0
    ? body.exerciseType.trim()
    : 'exercise'
  const totalReps = toSafeNumber(body.totalReps)
  const averageFormScore = toSafeNumber(body.averageFormScore)
  const duration = toSafeNumber(body.duration)
  const failurePoints = normalizeFailurePoints(body.failurePoints)
  const sampleTelemetry = Array.isArray(body.samples) ? body.samples.slice(-12) : []

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ debrief: FALLBACK_DEBRIEF, source: 'fallback', reason: 'missing_api_key' })
  }

  const systemPrompt = [
    'You are an expert physical therapist and AI coach.',
    `Analyze the following raw telemetry from a user's recent ${exerciseType} session.`,
    `The user completed ${totalReps} reps with an average form score of ${averageFormScore}%.`,
    `The session lasted ${duration} seconds.`,
    `Failure points observed: ${failurePoints.length > 0 ? failurePoints.join('; ') : 'none reported'}.`,
    `Raw telemetry samples: ${sampleTelemetry.length > 0 ? JSON.stringify(sampleTelemetry) : 'not provided'}.`,
    'Generate a 3-sentence empathetic, professional debrief highlighting what they did well and one specific biomechanical adjustment they should make next time based on the data.',
    'Keep the response concise, supportive, and specific to the telemetry. Do not use bullet points.',
  ].join(' ')

  try {
    const client = new GoogleGenerativeAI(apiKey)
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(systemPrompt)
    const text = result.response.text().trim()

    return NextResponse.json({
      debrief: text || FALLBACK_DEBRIEF,
      source: text ? 'gemini' : 'fallback',
    })
  } catch (error) {
    console.error('AI debrief generation failed:', error)
    return NextResponse.json({ debrief: FALLBACK_DEBRIEF, source: 'fallback' })
  }
}