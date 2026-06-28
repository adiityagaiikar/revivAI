import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival'

let cachedConnection: typeof mongoose | null = null
let cachedPromise: Promise<typeof mongoose> | null = null

export async function connectDB() {
  if (cachedConnection) {
    return cachedConnection
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGODB_URI)
  }

  cachedConnection = await cachedPromise
  return cachedConnection
}
