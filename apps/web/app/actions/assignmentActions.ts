'use server'

import { revalidatePath } from 'next/cache'
import { connectDB } from '@/lib/connectDB'
import User from '@/lib/models/User'

export async function claimPatient(patientId: string, doctorId: string) {
  try {
    await connectDB()

    const updatedPatient = await User.findByIdAndUpdate(
      patientId,
      { assignedDoctor: doctorId },
      { new: true }
    )

    if (!updatedPatient) {
      return { success: false, error: 'Patient not found.' }
    }

    revalidatePath('/doctor/dashboard')

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign patient.'
    return { success: false, error: message }
  }
}
