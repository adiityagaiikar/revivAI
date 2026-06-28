import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Instantiate once at module scope so the connection is reused across invocations
const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, eventType, data } = body as {
      patientId: string
      eventType: string
      data: Record<string, unknown>
    }

    if (!patientId || !eventType || !data) {
      return NextResponse.json(
        { success: false, error: 'patientId, eventType, and data are all required.' },
        { status: 400 }
      )
    }

    await pusher.trigger('clinic-connect-channel', eventType, data)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/pusher/broadcast] error:', err)
    return NextResponse.json(
      { success: false, error: err.message ?? 'Internal server error.' },
      { status: 500 }
    )
  }
}
