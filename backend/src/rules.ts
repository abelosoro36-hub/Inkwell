import { config } from './config'
import { one } from './db'
import type { JobRow, Plan, UserRow } from './types'

export const LIMIT: Record<Plan, number> = { free: 0, active: 3, review: 3, eligible: 3, premium: 10 }

// Prices live on the server (set in .env). The browser can never choose its own price.
export const PRICES = config.pay.prices

export const JOB_TYPES = ['Blog', 'Copywriting', 'Email', 'Case study', 'Whitepaper', 'Editing']

// Tasks a writer holds right now (claimed and not yet approved).
export function activeClaims(userId: string): number {
  const row = one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM jobs j
     WHERE j.claimed_by = ?
       AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.job_id = j.id AND s.status = 'approved')`,
    userId,
  )
  return row?.n ?? 0
}

// Returns the reason a writer can't claim this job, or null when it is allowed.
export function claimProblem(user: UserRow, job: JobRow): string | null {
  if (job.status !== 'open') return 'This task is not open.'
  if (job.claimed_by) return 'This task was already taken.'
  if (job.premium === 1 && user.plan !== 'premium') return 'This task is for Premium writers.'
  if (activeClaims(user.id) >= LIMIT[user.plan]) return 'You have no free task slots.'
  return null
}