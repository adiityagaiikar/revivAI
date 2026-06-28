import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { connectDB } from '@/lib/connectDB'
import Activity from '@/lib/models/Activity'
import User from '@/lib/models/User'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_NUDGE =
  'You had a mixed week, so next week is a chance to reset with one small win at a time. Keep the momentum gentle, trust the plan, and focus on showing up consistently rather than perfectly.'

function isAuthorizedCronRequest(request: Request) {
  const requestUrl = new URL(request.url)
  const isLocalDev =
    process.env.NODE_ENV === 'development' ||
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'

  if (isLocalDev) {
    return true
  }

  const cronHeader = request.headers.get('x-vercel-cron')
  if (cronHeader === '1') {
    return true
  }

  const expectedSecret = process.env.CRON_SECRET?.trim()
  const authorization = request.headers.get('authorization')?.trim()

  if (expectedSecret && authorization === `Bearer ${expectedSecret}`) {
    return true
  }

  return false
}

function parseFormScore(score: unknown) {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return score
  }

  if (typeof score === 'string') {
    const parsed = Number.parseInt(score.replace(/[^0-9.-]/g, ''), 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getWeeklyGoal(patient: { carePlan?: Array<{ taskType?: string }> }) {
  const physicalTasks = patient.carePlan?.filter((task) => task.taskType === 'PHYSICAL').length ?? 0
  return Math.max(physicalTasks, 1)
}

function normalizeNudge(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const patients = await User.find({ role: 'patient' })
      .select('_id name carePlan weeklySmartNudge')
      .lean<{
        _id: { toString(): string }
        name: string
        carePlan?: Array<{ taskType?: string }>
        weeklySmartNudge?: string
      }[]>()

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

    let flaggedCount = 0
    let nudgesWritten = 0

    for (const patient of patients) {
      const weeklySessions = await Activity.find({
        userId: patient._id,
        date: { $gte: cutoff },
        type: 'Fitness',
      })
        .sort({ date: 1 })
        .select('name score date')
        .lean<{ name?: string; score?: string; date?: Date | string }[]>()

      const totalWorkouts = weeklySessions.length
      const scheduledGoal = getWeeklyGoal(patient)
      const averageScore =
        weeklySessions.length > 0
          ? Math.round(
              weeklySessions.reduce((sum, session) => {
                const parsedScore = parseFormScore(session.score)
                return sum + (parsedScore ?? 0)
              }, 0) / weeklySessions.length,
            )
          : 0

      if (totalWorkouts < scheduledGoal) {
        flaggedCount += 1
      }

      let weeklySmartNudge = DEFAULT_NUDGE

      if (ai) {
        try {
          const prompt = [
            'You are an autonomous physical therapy agent reviewing a patient\'s weekly progress.',
            `Patient ${patient.name} completed ${totalWorkouts} out of ${scheduledGoal} workouts this past week, with an average kinematic form accuracy of ${averageScore}%.`,
            'Reason about their weekly trajectory (e.g., consistent progress, dropping off mid-week, or struggling with accuracy).',
            'Draft a highly tailored, 2-sentence weekly summary nudge to encourage them or keep them on track for next week.',
            'Keep it concise, supportive, and direct. Do not use bullets or markdown.',
          ].join(' ')

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          })

          const text = typeof response.text === 'string' ? response.text.trim() : ''
          if (text) {
            weeklySmartNudge = normalizeNudge(text)
          }
        } catch (error) {
          console.error(`Weekly compliance nudge generation failed for ${patient.name}:`, error)
        }
      }

      await User.updateOne(
        { _id: patient._id },
        { $set: { weeklySmartNudge } }
      )
      nudgesWritten += 1
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly compliance agent completed successfully.',
      flaggedCount,
      nudgesWritten,
    })
  } catch (error) {
    console.error('Weekly compliance agent failed:', error)
    return NextResponse.json(
      { success: false, message: 'Weekly compliance agent failed.' },
      { status: 500 },
    )
  }
}