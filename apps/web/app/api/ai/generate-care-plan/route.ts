/**
 * POST /api/ai/generate-care-plan
 *
 * Server-side Gemini proxy — the API key stays on the server.
 * Accepts a natural-language prompt + patientId, calls Gemini 2.5 Flash,
 * returns a structured CareTask[] JSON array.
 *
 * The caller (carePlanActions.ts) then sends the tasks to the Express
 * backend (/api/care-plan/assign-many) to persist in MongoDB.
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[AI Route] GEMINI_API_KEY is not set in environment.')
      return NextResponse.json(
        { error: 'AI service is not configured. Contact the administrator.' },
        { status: 503 },
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction:
        'You are a clinical AI assistant specialising in physical rehabilitation and cognitive therapy. ' +
        'Convert the doctor\'s request into a structured 7-day care plan. ' +
        'Output ONLY the raw JSON array — no markdown, no explanation, no code fences. ' +
        'Each task must have: taskType (PHYSICAL or COGNITIVE), taskName (string), ' +
        'targetValue (positive integer — reps, sets, minutes, or level), ' +
        'assignedDay (full day name e.g. Monday), isCompleted (always false).',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              taskType: {
                type: SchemaType.STRING,
                format: 'enum',
                enum: ['PHYSICAL', 'COGNITIVE'],
                description: 'Whether this is a physical exercise or a cognitive game task',
              } as any,
              taskName: {
                type: SchemaType.STRING,
                description: 'Name of the exercise or cognitive task, e.g. Squats, Corsi Block',
              },
              targetValue: {
                type: SchemaType.NUMBER,
                description: 'Target reps, sets, minutes, or difficulty level',
              },
              assignedDay: {
                type: SchemaType.STRING,
                description:
                  'Full day name: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
              },
              isCompleted: {
                type: SchemaType.BOOLEAN,
                description: 'Always false for newly assigned tasks',
              },
            },
            required: ['taskType', 'taskName', 'targetValue', 'assignedDay', 'isCompleted'],
          },
        },
      },
    })

    const result = await model.generateContent(prompt.trim())
    const rawText = result.response.text().trim()

    // Parse and validate
    let tasks: any[]
    try {
      tasks = JSON.parse(rawText)
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Gemini returned an empty or non-array response.')
      }
    } catch {
      console.error('[AI Route] Parse error. Raw:', rawText)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please rephrase your prompt.' },
        { status: 422 },
      )
    }

    // Enforce isCompleted: false
    tasks = tasks.map((t) => ({ ...t, isCompleted: false }))

    return NextResponse.json({ tasks })
  } catch (err: any) {
    console.error('[AI Route] Error:', err)
    return NextResponse.json(
      { error: err.message ?? 'AI generation failed.' },
      { status: 500 },
    )
  }
}
