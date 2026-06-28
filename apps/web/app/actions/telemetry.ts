'use server'

import { pusherServer } from '@/lib/pusher-server'

export async function broadcastTelemetry(
  patientId: string, 
  exerciseId: string, 
  progress: number, 
  reps: number
) {
  if (!patientId) return;

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.PUSHER_KEY;
  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherSecret = process.env.PUSHER_SECRET;

  if (
    !pusherKey ||
    pusherKey === 'dummy-key' ||
    !pusherAppId ||
    pusherAppId === 'dummy-app-id' ||
    !pusherSecret ||
    pusherSecret === 'dummy-secret'
  ) {
    console.log('Mock telemetry broadcast bypassed');
    return;
  }

  try {
    // We use a public channel for simplicity in this demo.
    // Channel name: session-[patientId]
    await pusherServer.trigger(`session-${patientId}`, 'telemetry-update', {
      patientId,
      exerciseId,
      progress,
      reps,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to broadcast telemetry via Pusher:', error);
  }
}
