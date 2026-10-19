import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { all, one, run, tx } from '../db'
import { requireAuth, requireRole, requireVerified } from '../auth'
import { jobOut } from '../models'
import { alertAdmins } from '../notify'
import { bodyOf, countWords, fail, str } from '../util'
import { claimProblem } from '../rules'
import type { JobRow, UserRow } from '../types'

const router = Router()

type Problem = { code: number; error: string } | null

// Public: open jobs. The id of whoever took a job is never exposed.
// Jobs are posted by the admin only (see routes/admin.ts).
router.get('/', (_req, res) => {
  const rows = all<JobRow>("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC")
  res.json({ jobs: rows.map((j) => ({ ...jobOut(j), claimedBy: undefined, taken: j.claimed_by !== null })) })
})

// Writer claims a task. Free accounts get a 402 so the site can send them to payment.
// The whole check-and-claim runs as one transaction, so two writers can never claim the same task.
router.post('/:id/claim', requireAuth, requireRole('writer'), requireVerified, (req, res) => {
  const user = req.user as UserRow
  if (user.plan === 'free') return fail(res, 402, 'Activate your account to claim tasks.', { needsPayment: true })
  const id = String(req.params.id)

  const problem = tx((): Problem => {
    const job = one<JobRow>('SELECT * FROM jobs WHERE id = ?', id)
    if (!job) return { code: 404, error: 'Task not found.' }
    const why = claimProblem(user, job)
    if (why) return { code: 409, error: why }
    run('UPDATE jobs SET claimed_by = ? WHERE id = ?', user.id, id)
    return null
  })
  if (problem) return fail(res, problem.code, problem.error)
  res.json({ ok: true })
})

router.post('/:id/release', requireAuth, requireRole('writer'), (req, res) => {
  const user = req.user as UserRow
  const id = String(req.params.id)

  const problem = tx((): Problem => {
    const job = one<JobRow>('SELECT * FROM jobs WHERE id = ? AND claimed_by = ?', id, user.id)
    if (!job) return { code: 404, error: 'Task not found.' }
    const busy = one("SELECT id FROM submissions WHERE job_id = ? AND status IN ('pending','approved')", id)
    if (busy) return { code: 409, error: 'This task already has work under review or approved.' }
    run('UPDATE jobs SET claimed_by = NULL WHERE id = ?', id)
    return null
  })
  if (problem) return fail(res, problem.code, problem.error)
  res.json({ ok: true })
})

router.post('/:id/submit', requireAuth, requireRole('writer'), (req, res) => {
  const user = req.user as UserRow
  const id = String(req.params.id)
  const text = str(bodyOf(req.body).text, 100000)
  const words = countWords(text)
  if (words < 1) return fail(res, 400, 'Write something before submitting.')

  const problem = tx((): Problem => {
    const job = one<JobRow>('SELECT * FROM jobs WHERE id = ? AND claimed_by = ?', id, user.id)
    if (!job) return { code: 404, error: 'Claim this task first.' }
    const existing = one<{ id: string; status: string }>('SELECT id, status FROM submissions WHERE job_id = ? AND writer_id = ?', id, user.id)
    if (!existing) {
      run('INSERT INTO submissions (id, job_id, writer_id, words, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        randomUUID(), id, user.id, words, text, 'pending', Date.now())
    } else if (existing.status === 'revision' || existing.status === 'rejected') {
      run("UPDATE submissions SET text = ?, words = ?, status = 'pending', note = NULL WHERE id = ?", text, words, existing.id)
    } else {
      return { code: 409, error: 'This work is already submitted.' }
    }
    return null
  })
  if (problem) return fail(res, problem.code, problem.error)

  const title = one<{ title: string }>('SELECT title FROM jobs WHERE id = ?', id)?.title ?? 'a task'
  alertAdmins('New work to review', `${user.name} submitted “${title}” (${words} words).`)
  res.status(201).json({ ok: true })
})

export default router