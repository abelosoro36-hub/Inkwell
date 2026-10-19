import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { all, one, run } from '../db'
import { requireAuth, requireRole } from '../auth'
import { config } from '../config'
import { notifyPaymentRejected } from '../notify'
import { applyPayment } from '../payments/apply'
import { bodyOf, fail, num, str } from '../util'
import type { MethodRow, PaymentRow, UserRow } from '../types'

const router = Router()
router.use(requireAuth, requireRole('admin'))

interface PaymentListRow extends PaymentRow {
  user_name: string
  user_email: string
}

const paymentOut = (p: PaymentListRow) => ({
  id: p.id,
  kind: p.kind,
  amount: p.amount,
  currency: p.currency ?? config.pay.currency,
  method: p.method ?? (p.provider_ref === 'manual' ? 'Recorded by admin' : 'Unknown'),
  status: p.status,
  reference: p.reference,
  proof: p.proof,
  review: p.review,
  reviewNote: p.review_note,
  userName: p.user_name,
  userEmail: p.user_email,
  createdAt: p.created_at,
})

const methodOut = (m: MethodRow) => ({ id: m.id, name: m.name, instructions: m.instructions, enabled: m.enabled === 1 })

// ----- fees paid by writers -----
router.get('/payments', (_req, res) => {
  const rows = all<PaymentListRow>(
    `SELECT p.*, u.name AS user_name, u.email AS user_email
     FROM payments p JOIN users u ON u.id = p.user_id
     ORDER BY CASE WHEN p.review = 'submitted' AND p.status = 'pending' THEN 0 ELSE 1 END, p.created_at DESC
     LIMIT 200`,
  )
  res.json({ payments: rows.map(paymentOut) })
})

// You checked your bank or mobile money and the money is there: unlock the writer.
router.post('/payments/:id/approve', (req, res) => {
  const id = String(req.params.id)
  const p = one<PaymentRow>("SELECT * FROM payments WHERE id = ? AND status = 'pending'", id)
  if (!p) return fail(res, 404, 'Payment not found or already completed.')
  if (p.reference === null) return fail(res, 409, 'Only bank and similar payments are approved here. PayPal payments confirm themselves.')
  const result = applyPayment(id)
  res.json({ ok: true, applied: result.applied })
})

router.post('/payments/:id/reject', (req, res) => {
  const id = String(req.params.id)
  const p = one<PaymentRow>("SELECT * FROM payments WHERE id = ? AND status = 'pending'", id)
  if (!p) return fail(res, 404, 'Payment not found or already completed.')
  if (p.reference === null) return fail(res, 409, 'Only bank and similar payments can be rejected here.')
  const note = str(bodyOf(req.body).note, 500) || null
  run("UPDATE payments SET review = 'rejected', review_note = ? WHERE id = ?", note, id)
  const writer = one<UserRow>('SELECT * FROM users WHERE id = ?', p.user_id)
  if (writer) notifyPaymentRejected(writer.email, writer.name, note)
  res.json({ ok: true })
})

// ----- ways to pay (bank, mobile money, anything) -----
router.get('/payment-methods', (_req, res) => {
  res.json({ methods: all<MethodRow>('SELECT * FROM payment_methods ORDER BY sort, created_at').map(methodOut) })
})

router.post('/payment-methods', (req, res) => {
  const b = bodyOf(req.body)
  const name = str(b.name, 60)
  const instructions = str(b.instructions, 1500)
  if (!name || !instructions) return fail(res, 400, 'Give the method a name and payment instructions.')
  const next = one<{ n: number }>('SELECT COUNT(*) AS n FROM payment_methods')?.n ?? 0
  const id = randomUUID()
  run('INSERT INTO payment_methods (id, name, instructions, enabled, sort, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id, name, instructions, b.enabled === false ? 0 : 1, next, Date.now())
  res.status(201).json({ method: methodOut(one<MethodRow>('SELECT * FROM payment_methods WHERE id = ?', id) as MethodRow) })
})

router.put('/payment-methods/:id', (req, res) => {
  const id = String(req.params.id)
  if (!one('SELECT id FROM payment_methods WHERE id = ?', id)) return fail(res, 404, 'Method not found.')
  const b = bodyOf(req.body)
  const name = str(b.name, 60)
  const instructions = str(b.instructions, 1500)
  if (!name || !instructions) return fail(res, 400, 'Give the method a name and payment instructions.')
  run('UPDATE payment_methods SET name = ?, instructions = ?, enabled = ? WHERE id = ?', name, instructions, b.enabled === true ? 1 : 0, id)
  res.json({ method: methodOut(one<MethodRow>('SELECT * FROM payment_methods WHERE id = ?', id) as MethodRow) })
})

router.delete('/payment-methods/:id', (req, res) => {
  run('DELETE FROM payment_methods WHERE id = ?', String(req.params.id))
  res.json({ ok: true })
})

// ----- money received from clients for their work (recorded by hand, any method) -----
interface ReceivedRow {
  id: string
  payer: string
  job_id: string | null
  method: string
  amount_minor: number
  currency: string
  reference: string | null
  note: string | null
  created_at: number
  job_title: string | null
}

router.get('/received', (_req, res) => {
  const rows = all<ReceivedRow>(
    `SELECT r.*, j.title AS job_title FROM received_payments r
     LEFT JOIN jobs j ON j.id = r.job_id ORDER BY r.created_at DESC LIMIT 200`,
  )
  res.json({
    received: rows.map((r) => ({
      id: r.id,
      payer: r.payer,
      jobTitle: r.job_title,
      method: r.method,
      amount: r.amount_minor / 100,
      currency: r.currency,
      reference: r.reference,
      note: r.note,
      createdAt: r.created_at,
    })),
  })
})

router.post('/received', (req, res) => {
  const b = bodyOf(req.body)
  const payer = str(b.payer, 120)
  const method = str(b.method, 60)
  const amount = num(b.amount)
  const jobId = str(b.jobId, 80) || null
  if (!payer || !method) return fail(res, 400, 'Say who paid and how.')
  if (!(amount > 0 && amount < 10000000)) return fail(res, 400, 'Enter a valid amount.')
  if (jobId && !one('SELECT id FROM jobs WHERE id = ?', jobId)) return fail(res, 404, 'That job does not exist.')

  run(
    'INSERT INTO received_payments (id, payer, job_id, method, amount_minor, currency, reference, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    randomUUID(), payer, jobId, method, Math.round(amount * 100), config.pay.currency,
    str(b.reference, 120) || null, str(b.note, 500) || null, (req.user as UserRow).id, Date.now(),
  )
  res.status(201).json({ ok: true })
})

export default router