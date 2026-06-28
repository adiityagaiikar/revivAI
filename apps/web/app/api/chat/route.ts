import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT =
  'You are reviVAI, a helpful fitness and recovery assistant for this application. ' +
  'Answer questions about workouts, the app, and recovery concisely. ' +
  'Keep responses brief, friendly, and practical. ' +
  'Never break character. Focus only on fitness, recovery, and the revivAI app.'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { text: 'AI service is not configured. Please add your GEMINI_API_KEY.' },
        { status: 200 }
      )
    }

    const client = new GoogleGenerativeAI(apiKey)
    const model  = client.getGenerativeModel({
      model:            'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    })

    // Build multi-turn history (all messages except the last user one)
    const history = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
      role:  m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }))

    // Start a chat with history, then send the latest user message
    const chat = model.startChat({ history })
    const lastMsg = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMsg.text)
    const text   = result.response.text().trim()

    return NextResponse.json({
      text: text || "I'm sorry, I couldn't generate a response. Please try again.",
    })
  } catch (err: any) {
    console.error('[/api/chat] error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error.' },
      { status: 500 }
    )
  }
}
