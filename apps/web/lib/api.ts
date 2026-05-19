// Central API base URL — set NEXT_PUBLIC_API_URL in your Vercel/Render env vars
// e.g. NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
