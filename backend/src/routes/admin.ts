import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { all, one, run, tx } from '../db'
import { requireAuth, requireRole } from '../auth'
import { SUB_SELECT, jobOut, subOut, userOut } from '../models'
import { notifyClient, notifyPaid, notifySample, notifyWork } from '../notify'
import { bodyOf, fail, num, str } from '../util'
import { JOB_TYPES, PRICES } from '../rules'
import type { JobRow, SubRow, UserRow } from '../types'

const router = Router()
router.use(requireAuth, requireRole('admin'))

interface JobInput {
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium: number
}

function parseJob(b: Record<string, unknown>): JobInput | string {
  const title = str(b.title, 140)
  const client = str(b.client, 120)
  const type = str(b.type, 40)
  const pay = num(b.pay)
  const words = num(b.words)
  if (!title || !client) return 'Title and client are required.'
  if (!JOB_TYPES.includes(type)) return 'Choose a valid type.'
  if (!(pay >= 1 && pay <= 10000)) return 'Enter a valid pay amount.'
  if (!(words >= 50 && words <= 100000)) return 'Enter a valid word count.'
  return { title, client, type, pay: Math.round(pay), words: Math.round(words), due: str(b.due, 40) || '7 days', premium: b.premium === true ? 1 : 0 }
}

const count = (sql: string): number => one<{ n: number }>(sql)?.n ?? 0

router.get('/overview', (_req, res) => {
  res.json({
    openJobs: count("SELECT COUNT(*) AS n FROM jobs WHERE status = 'open'"),
    clientsWaiting: count("SELECT COUNT(*) AS n FROM users WHERE role = 'client' AND approval = 'pending'"),
    samplesWaiting: count("SELECT COUNT(*) AS n FROM users WHERE role = 'writer' AND plan = 'review'"),
    workToReview: count("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'"),
  })
})

// ----- jobs (only the admin posts work) -----
router.get('/jobs', (_req, res) => {
  res.json({ jobs: all<JobRow>('SELECT * FROM jobs ORDER BY created_at DESC').map(jobOut) })
})

router.post('/jobs', (req, res) => {
  const parsed = parseJob(bodyOf(req.body))
  if (typeof parsed === 'string') return fail(res, 400, parsed)
  const id = randomUUID()
  run(
    "INSERT INTO jobs (id, title, client, type, pay, words, due, premium, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
    id, parsed.title, parsed.client, parsed.type, parsed.pay, parsed.words, parsed.due, parsed.premium, (req.user as UserRow).id, Date.now(),
  )
  res.status(201).json({ job: jobOut(one<JobRow>('SELECT * FROM jobs WHERE id = ?', id) as JobRow) })
})

router.put('/jobs/:id', (req, res) => {
  const id = String(req.params.id)
  if (!one('SELECT id FROM jobs WHERE id = ?', id)) return fail(res, 404, 'Job not found.')
  const parsed = parseJob(bodyOf(req.body))
  if (typeof parsed === 'string') return fail(res, 400, parsed)
  run('UPDATE jobs SET title = ?, client = ?, type = ?, pay = ?, words = ?, due = ?, premium = ? WHERE id = ?',
    parsed.title, parsed.client, parsed.type, parsed.pay, parsed.words, parsed.due, parsed.premium, id)
  res.json({ job: jobOut(one<JobRow>('SELECT * FROM jobs WHERE id = ?', id) as JobRow) })
})

router.patch('/jobs/:id/status', (req, res) => {
  const id = String(req.params.id)
  if (!one('SELECT id FROM jobs WHERE id = ?', id)) return fail(res, 404, 'Job not found.')
  const status = bodyOf(req.body).status
  if (status !== 'open' && status !== 'closed') return fail(res, 400, 'Status must be open or closed.')
  run('UPDATE jobs SET status = ? WHERE id = ?', status, id)
  res.json({ job: jobOut(one<JobRow>('SELECT * FROM jobs WHERE id = ?', id) as JobRow) })
})

router.delete('/jobs/:id', (req, res) => {
  const id = String(req.params.id)
  const job = one<JobRow>('SELECT * FROM jobs WHERE id = ?', id)
  if (!job) return fail(res, 404, 'Job not found.')
  if (job.claimed_by) return fail(res, 409, 'This job is claimed. Close it instead of deleting it.')
  run('DELETE FROM jobs WHERE id = ?', id)
  res.json({ ok: true })
})

// ----- clients -----
router.get('/clients', (_req, res) => {
  res.json({ clients: all<UserRow>("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC").map(userOut) })
})

router.patch('/clients/:id', (req, res) => {
  const id = String(req.params.id)
  const client = one<UserRow>("SELECT * FROM users WHERE id = ? AND role = 'client'", id)
  if (!client) return fail(res, 404, 'Client not found.')
  const status = bodyOf(req.body).status
  if (status !== 'approved' && status !== 'rejected') return fail(res, 400, 'Status must be approved or rejected.')
  run('UPDATE users SET approval = ? WHERE id = ?', status, id)
  notifyClient(client.email, client.name, status === 'approved')
  res.json({ client: userOut(one<UserRow>('SELECT * FROM users WHERE id = ?', id) as UserRow) })
})

// ----- writers -----
router.get('/writers', (_req, res) => {
  res.json({ writers: all<UserRow>("SELECT * FROM users WHERE role = 'writer' ORDER BY created_at DESC").map(userOut) })
})

// Approve or reject a writing sample.
router.patch('/writers/:id', (req, res) => {
  const id = String(req.params.id)
  const writer = one<UserRow>("SELECT * FROM users WHERE id = ? AND role = 'writer'", id)
  if (!writer) return fail(res, 404, 'Writer not found.')
  if (writer.plan !== 'review') return fail(res, 409, 'This writer has no sample waiting for review.')
  const b = bodyOf(req.body)
  if (b.action === 'approve_sample') {
    run("UPDATE users SET plan = 'eligible', sample_note = NULL WHERE id = ?", id)
    notifySample(writer.email, writer.name, true, null)
  } else if (b.action === 'reject_sample') {
    const note = str(b.note, 500) || 'Please improve your sample and send it again.'
    run("UPDATE users SET plan = 'active', sample_note = ? WHERE id = ?", note, id)
    notifySample(writer.email, writer.name, false, note)
  } else {
    return fail(res, 400, 'Action must be approve_sample or reject_sample.')
  }
  res.json({ writer: userOut(one<UserRow>('SELECT * FROM users WHERE id = ?', id) as UserRow) })
})

// Record a payment received outside the website (bank, mobile money, cash) and unlock the account.
router.post('/writers/:id/grant', (req, res) => {
  const id = String(req.params.id)
  const writer = one<UserRow>("SELECT * FROM users WHERE id = ? AND role = 'writer'", id)
  if (!writer) return fail(res, 404, 'Writer not found.')
  const plan = bodyOf(req.body).plan
  const kind = plan === 'active' ? 'activate' : plan === 'premium' ? 'premium' : null
  if (!kind) return fail(res, 400, 'Plan must be active or premium.')
  if (kind === 'activate' && writer.plan !== 'free') return fail(res, 409, 'This account is already active.')
  if (kind === 'premium' && writer.plan !== 'eligible') return fail(res, 409, 'Premium needs the panel to approve a sample first.')

  tx(() => {
    run(
      "INSERT INTO payments (id, user_id, kind, amount, task_id, status, provider_ref, created_at) VALUES (?, ?, ?, ?, NULL, 'paid', 'manual', ?)",
      randomUUID(), id, kind, PRICES[kind], Date.now(),
    )
    run('UPDATE users SET plan = ? WHERE id = ?', kind === 'activate' ? 'active' : 'premium', id)
  })
  notifyPaid(writer.email, writer.name, kind)
  res.json({ writer: userOut(one<UserRow>('SELECT * FROM users WHERE id = ?', id) as UserRow) })
})

// ----- submitted work -----
router.get('/submissions', (_req, res) => {
  res.json({ submissions: all<SubRow>(`${SUB_SELECT} ORDER BY s.created_at DESC`).map(subOut) })
})

router.patch('/submissions/:id', (req, res) => {
  const id = String(req.params.id)
  const sub = one<{ status: string }>('SELECT status FROM submissions WHERE id = ?', id)
  if (!sub) return fail(res, 404, 'Submission not found.')
  if (sub.status !== 'pending') return fail(res, 409, 'This work was already reviewed.')
  const b = bodyOf(req.body)
  const status = b.status
  if (status !== 'approved' && status !== 'revision' && status !== 'rejected') {
    return fail(res, 400, 'Status must be approved, revision or rejected.')
  }
  const note = str(b.note, 500) || null
  run('UPDATE submissions SET status = ?, note = ? WHERE id = ?', status, note, id)

  const info = one<{ email: string; name: string; title: string }>(
    'SELECT u.email AS email, u.name AS name, j.title AS title FROM submissions s JOIN users u ON u.id = s.writer_id JOIN jobs j ON j.id = s.job_id WHERE s.id = ?',
    id,
  )
  if (info) notifyWork(info.email, info.name, info.title, status, note)

  res.json({ submission: subOut(one<SubRow>(`${SUB_SELECT} WHERE s.id = ?`, id) as SubRow) })
})

export default router