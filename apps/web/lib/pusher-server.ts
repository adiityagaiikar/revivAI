import PusherServer from 'pusher';

// Fallbacks are provided so the app doesn't crash if env vars are missing, 
// though broadcasting will fail silently without valid keys.
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || 'dummy-app-id',
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'dummy-key',
  secret: process.env.PUSHER_SECRET || 'dummy-secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});
