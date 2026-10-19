import { Router } from 'express'
import { all, one, run } from '../db'
import { requireAuth, requireRole, requireVerified } from '../auth'
import { SUB_SELECT, jobOut, subOut } from '../models'
import { alertAdmins } from '../notify'
import { bodyOf, countWords, fail, str } from '../util'
import type { JobRow, SubRow, UserRow } from '../types'

const router = Router()
router.use(requireAuth, requireRole('writer'))

// My claimed tasks, my submissions and my approved earnings.
router.get('/work', (req, res) => {
  const user = req.user as UserRow
  const tasks = all<JobRow>('SELECT * FROM jobs WHERE claimed_by = ? ORDER BY created_at DESC', user.id)
  const subs = all<SubRow>(`${SUB_SELECT} WHERE s.writer_id = ? ORDER BY s.created_at DESC`, user.id)
  const earned = one<{ total: number }>(
    "SELECT COALESCE(SUM(j.pay), 0) AS total FROM submissions s JOIN jobs j ON j.id = s.job_id WHERE s.writer_id = ? AND s.status = 'approved'",
    user.id,
  )
  res.json({ plan: user.plan, tasks: tasks.map(jobOut), submissions: subs.map(subOut), earned: earned?.total ?? 0 })
})

// Send a sample to the review panel (needs an active account).
router.post('/sample', requireVerified, (req, res) => {
  const user = req.user as UserRow
  if (user.plan === 'free') return fail(res, 402, 'Activate your account first.', { needsPayment: true })
  if (user.plan !== 'active') return fail(res, 409, 'Your sample is already sent or approved.')
  const text = str(bodyOf(req.body).text, 20000)
  if (countWords(text) < 50) return fail(res, 400, 'Write at least 50 words for your sample.')
  run("UPDATE users SET sample = ?, sample_note = NULL, plan = 'review' WHERE id = ?", text, user.id)
  alertAdmins('A writing sample is waiting for review', `${user.name} sent a sample to the review panel.`)
  res.json({ ok: true, plan: 'review' })
})

export default router