'use server'

import { COMMON_ISSUES, type CommonIssue } from '@/lib/constants'

/**
 * triageActions.ts  —  Next.js Server Actions: Clinical Triage + Load Balancing
 *
 * Pipeline (autoAssignDoctor):
 *   1. Find all doctors whose specialties overlap with the patient's issues.
 *   2. Count each matched doctor's current patient load via a single aggregation.
 *   3. Sort matched pool ascending by patient count (lowest workload first).
 *   4. Assign winner = pool[0].
 *   Fallback: If no specialty match → run the same workload calc on ALL doctors
 *             and still assign the least-busy one.
 *
 * Runs exclusively on the server (Node.js) — never sent to the browser.
 * Requires mongoose (serverExternalPackages in next.config.mjs).
 */

import { revalidatePath } from 'next/cache'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/connectDB'
import User from '@/lib/models/User'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface AutoAssignResult {
  success: true
  doctorName: string
  assignedDoctorId: string
  matchScore: number   // specialty overlaps with the winning doctor
  patientLoad: number  // patients already on the winning doctor's list
  isFallback: boolean  // true → no specialty match, used least-busy overall
  message: string
}

export interface TriageDoctor {
  _id: string
  name: string
  email: string
  specialties: string[]
  patientLoad?: number
}


/* ─────────────────────────────────────────────
   Internal helper: workload aggregation
   Given a list of doctor ObjectIds, returns a
   Map<doctorId, patientCount> in one DB round-trip.
───────────────────────────────────────────── */
async function getWorkloadMap(
  doctorIds: mongoose.Types.ObjectId[],
): Promise<Map<string, number>> {
  if (doctorIds.length === 0) return new Map()

  const counts: { _id: mongoose.Types.ObjectId; count: number }[] =
    await User.aggregate([
      {
        $match: {
          role: 'patient',
          assignedDoctor: { $in: doctorIds },
        },
      },
      {
        $group: {
          _id: '$assignedDoctor',
          count: { $sum: 1 },
        },
      },
    ])

  return new Map(counts.map((c) => [String(c._id), c.count]))
}

/* ─────────────────────────────────────────────
   Internal helper: sort a pool by workload
   Returns the pool sorted ascending (least-busy first).
───────────────────────────────────────────── */
function sortByWorkload<T extends { _id: any }>(
  pool: T[],
  workloadMap: Map<string, number>,
): T[] {
  return [...pool].sort((a, b) => {
    const ca = workloadMap.get(String(a._id)) ?? 0
    const cb = workloadMap.get(String(b._id)) ?? 0
    return ca - cb
  })
}

/* ─────────────────────────────────────────────
   autoAssignDoctor  ← Server Action

   Full load-balanced specialty matching pipeline.
───────────────────────────────────────────── */
export async function autoAssignDoctor(
  patientId: string,
  selectedIssues: string[],
): Promise<AutoAssignResult> {
  /* ── Guard clauses ── */
  if (!patientId?.trim()) {
    throw new Error('patientId is required.')
  }
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error('Invalid session detected. Please log out and log in again to use the assignment feature.')
  }
  if (!selectedIssues?.length) {
    throw new Error('Select at least one issue before continuing.')
  }

  await connectDB()

  /* ── Step 1: Fetch all doctors (name + specialties only) ── */
  const allDoctors = await User.find(
    { role: 'doctor' },
    { name: 1, specialties: 1 },
  ).lean<{ _id: mongoose.Types.ObjectId; name: string; specialties: string[] }[]>()

  if (!allDoctors.length) {
    throw new Error(
      'No care providers are available right now. Please try again later.',
    )
  }

  /* ── Step 2: Filter to specialty-matched providers ── */
  const issueSet = new Set(
    selectedIssues.map((s) => s.toLowerCase().trim()),
  )

  const specialtyMatched = allDoctors.filter((doc) =>
    (doc.specialties ?? []).some((sp) =>
      issueSet.has(sp.toLowerCase().trim()),
    ),
  )

  const isFallback = specialtyMatched.length === 0
  const pool = isFallback ? allDoctors : specialtyMatched

  /* ── Step 3: Count workload for every doctor in the pool (single aggregation) ── */
  const poolIds = pool.map((d) => d._id as mongoose.Types.ObjectId)
  const workloadMap = await getWorkloadMap(poolIds)

  /* ── Step 4: Sort pool ascending by patient count ── */
  const sortedPool = sortByWorkload(pool, workloadMap)

  /* ── Step 5: Winner = least-busy doctor ── */
  const winner = sortedPool[0]
  const winnerLoad = workloadMap.get(String(winner._id)) ?? 0

  /* ── Step 6: Compute specialty overlap score for the winner ── */
  const winnerSpecialties = (winner.specialties ?? []).map((s) =>
    s.toLowerCase().trim(),
  )
  const matchScore = winnerSpecialties.filter((sp) => issueSet.has(sp)).length

  /* ── Step 7: Atomically update patient document ── */
  const updatedPatient = await User.findByIdAndUpdate(
    patientId,
    {
      $set: {
        issues: selectedIssues,
        assignedDoctor: winner._id,
      },
    },
    { new: true },
  )

  if (!updatedPatient) {
    throw new Error(
      'Patient record not found. Please log out and log back in.',
    )
  }

  /* ── Step 8: Invalidate the patient dashboard cache ── */
  revalidatePath('/dashboard')
  revalidatePath('/doctor-dashboard')

  /* ── Return enriched result ── */
  return {
    success: true,
    doctorName: winner.name,
    assignedDoctorId: String(winner._id),
    matchScore,
    patientLoad: winnerLoad,
    isFallback,
    message: isFallback
      ? `Assigned to least-busy provider (${winnerLoad} patient${winnerLoad !== 1 ? 's' : ''} on roster).`
      : `Matched by ${matchScore} specialt${matchScore !== 1 ? 'ies' : 'y'} · load balanced (${winnerLoad} patient${winnerLoad !== 1 ? 's' : ''}).`,
  }
}

/* ─────────────────────────────────────────────
   getTriageDoctors  ← Server Action
   Returns all doctors with live patient-load counts.
───────────────────────────────────────────── */
export async function getTriageDoctors(): Promise<TriageDoctor[]> {
  await connectDB()

  const doctors = await User.find(
    { role: 'doctor' },
    { name: 1, email: 1, specialties: 1 },
  ).lean<{ _id: mongoose.Types.ObjectId; name: string; email: string; specialties: string[] }[]>()

  if (!doctors.length) return []

  const doctorIds = doctors.map((d) => d._id)
  const workloadMap = await getWorkloadMap(doctorIds)

  return doctors.map((d) => ({
    _id: String(d._id),
    name: d.name,
    email: d.email,
    specialties: d.specialties ?? [],
    patientLoad: workloadMap.get(String(d._id)) ?? 0,
  }))
}

/* ─────────────────────────────────────────────
   updateDoctorSpecialties  ← Server Action
   Lets a doctor update their specialty list.
───────────────────────────────────────────── */
export async function updateDoctorSpecialties(
  doctorId: string,
  specialties: string[],
): Promise<{ specialties: string[] }> {
  if (!doctorId) throw new Error('doctorId is required.')

  await connectDB()

  const updated = await User.findByIdAndUpdate(
    doctorId,
    { $set: { specialties } },
    { new: true, select: 'specialties' },
  ).lean<{ specialties: string[] }>()

  if (!updated) throw new Error('Doctor record not found.')

  revalidatePath('/doctor-dashboard')

  return { specialties: updated.specialties ?? [] }
}
