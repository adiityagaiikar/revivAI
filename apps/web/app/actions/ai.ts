'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateSessionDebrief(
  patientId: string, 
  workoutData: {
    exerciseName: string
    duration: string
    reps: number
    score: number
  }
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found. Returning fallback response.")
      return {
        patientMessage: "Great job completing your session! Keep up the good work.",
        clinicalNote: `SOAP NOTE:\nS: Patient completed ${workoutData.exerciseName}.\nO: ${workoutData.reps} reps, ${workoutData.score}% score.\nA: Progressing as expected.\nP: Continue current plan.`
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    })

    const prompt = `You are an orthopedic AI scribe. 
Analyze this raw kinematic data for a patient session:
- Exercise: ${workoutData.exerciseName}
- Duration: ${workoutData.duration}
- Reps Completed: ${workoutData.reps}
- Peak Score / Progress: ${workoutData.score}%

Return a JSON object with exactly two keys:
1. "patientMessage": An encouraging 2-sentence summary addressed directly to the patient.
2. "clinicalNote": A formal medical observation SOAP note detailing the session metrics.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Parse the JSON
    const parsed = JSON.parse(responseText)
    
    return {
      patientMessage: parsed.patientMessage || "Great job today!",
      clinicalNote: parsed.clinicalNote || "Session completed."
    }

  } catch (error) {
    console.error("Gemini AI Debrief Error:", error)
    return {
      patientMessage: "Awesome work! We've recorded your session.",
      clinicalNote: `System Fallback Note: ${workoutData.exerciseName} completed with score ${workoutData.score}%.`
    }
  }
}
