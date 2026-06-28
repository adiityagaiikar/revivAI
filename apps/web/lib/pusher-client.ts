import PusherClient from 'pusher-js';

// Singleton instance to prevent multiple connections
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;
  
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'dummy-key',
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      }
    );
  }
  
  return pusherClientInstance;
};
