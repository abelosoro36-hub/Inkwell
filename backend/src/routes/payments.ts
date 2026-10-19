import { Router } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { all, one, run } from '../db'
import { requireAuth, requireRole, requireVerified } from '../auth'
import { config } from '../config'
import { userOut } from '../models'
import { alertAdmins } from '../notify'
import { applyPayment } from '../payments/apply'
import { cardAmount, cardEnabled, createCardPayment } from '../payments/cards'
import { confirmPayment } from '../payments/confirm'
import { mpesaAmount, mpesaEnabled, normalizePhone, stkPush } from '../payments/mpesa'
import { createOrder, paypalEnabled } from '../payments/paypal'
import { tooMany } from '../rateLimit'
import { PRICES } from '../rules'
import { bodyOf, fail, str } from '../util'
import type { JobRow, MethodRow, PaymentRow, UserRow } from '../types'

const router = Router()
router.use(requireAuth, requireRole('writer'))

const HOUR = 60 * 60 * 1000
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ONLINE_METHODS = ['PayPal', 'PayPal card', 'Card', 'M-Pesa']

// A short code the person puts on a bank transfer so we can find it.
function makeReference(): string {
  let code = ''
  for (const b of randomBytes(6)) code += ALPHABET[b % ALPHABET.length]
  return `INK-${code}`
}

function insertPayment(
  id: string,
  user: UserRow,
  kind: 'activate' | 'premium',
  taskId: string | null,
  method: string,
  reference: string | null,
): void {
  run(
    "INSERT INTO payments (id, user_id, kind, amount, task_id, status, method, currency, reference, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
    id, user.id, kind, PRICES[kind], taskId, method, config.pay.currency, reference, Date.now(),
  )
}

// What the payment window shows: price, and the ways the person can pay.
router.get('/options', (_req, res) => {
  const live = config.pay.mode === 'live'
  const methods = all<MethodRow>('SELECT * FROM payment_methods WHERE enabled = 1 ORDER BY sort, created_at')
  res.json({
    mode: config.pay.mode,
    currency: config.pay.currency,
    prices: PRICES,
    paypal: live && paypalEnabled(),
    card:
      live && cardEnabled()
        ? { currency: config.pay.card.currency, amount: { activate: cardAmount(PRICES.activate), premium: cardAmount(PRICES.premium) } }
        : null,
    mpesa: live && mpesaEnabled() ? { amount: { activate: mpesaAmount(PRICES.activate), premium: mpesaAmount(PRICES.premium) } } : null,
    methods: live ? methods.map((m) => ({ id: m.id, name: m.name, instructions: m.instructions })) : [],
  })
})

// Starts a payment. method is "paypal", "card", "mpesa", "demo" (testing only)
// or the id of a bank / till / send-money method the admin set up.
router.post('/checkout', requireVerified, async (req, res) => {
  const user = req.user as UserRow
  const b = bodyOf(req.body)
  const kind = b.kind === 'premium' ? 'premium' : 'activate'
  const taskId = str(b.taskId, 80) || null
  const method = str(b.method, 80)

  if (kind === 'activate' && user.plan !== 'free') return fail(res, 409, 'Your account is already active.')
  // Premium needs two things: the writing test approved by the panel, and the payment. No finished tasks needed.
  if (kind === 'premium' && user.plan !== 'eligible') return fail(res, 409, 'Premium opens after you pass the writing test.')
  if (taskId) {
    const job = one<JobRow>('SELECT * FROM jobs WHERE id = ?', taskId)
    if (!job || job.status !== 'open' || job.claimed_by || job.premium === 1) return fail(res, 409, 'That task is not available.')
  }
  if (tooMany(`checkout:${user.id}`, 20, HOUR)) return fail(res, 429, 'Too many payment attempts. Try again later.')

  const id = randomUUID()
  const common = { id, kind, amount: PRICES[kind], currency: config.pay.currency }
  const description = kind === 'activate' ? 'Inkwell account activation' : 'Inkwell Premium upgrade'
  const returnUrl = `${config.appUrl}/?pay=${id}`

  // testing only
  if (method === 'demo') {
    if (config.pay.mode !== 'demo') return fail(res, 400, 'That payment method is not available.')
    insertPayment(id, user, kind, taskId, 'Demo', null)
    res.status(201).json({ payment: common, mode: 'demo' })
    return
  }
  if (config.pay.mode === 'demo') return fail(res, 400, 'Real payments are switched off (PAYMENT_MODE=demo).')

  // PayPal: the person pays with a PayPal account on PayPal's page, then comes back to the website
  if (method === 'paypal') {
    if (!paypalEnabled()) return fail(res, 400, 'PayPal is not available right now.')
    insertPayment(id, user, kind, taskId, 'PayPal', null)
    try {
      const order = await createOrder({
        paymentId: id,
        amount: PRICES[kind],
        currency: config.pay.currency,
        description,
        returnUrl,
        cancelUrl: `${config.appUrl}/?paycancel=1`,
      })
      run('UPDATE payments SET provider_ref = ? WHERE id = ?', order.orderId, id)
      res.status(201).json({ payment: common, url: order.approveUrl })
    } catch (e) {
      run('DELETE FROM payments WHERE id = ?', id)
      fail(res, 502, e instanceof Error ? e.message : 'PayPal could not start the payment.')
    }
    return
  }

  // Card: its own card gateway (Paystack or Flutterwave), no PayPal involved
  if (method === 'card') {
    if (!cardEnabled()) return fail(res, 400, 'Card payment is not available right now.')
    insertPayment(id, user, kind, taskId, 'Card', null)
    try {
      const card = await createCardPayment({
        paymentId: id,
        email: user.email,
        name: user.name,
        amount: cardAmount(PRICES[kind]),
        currency: config.pay.card.currency,
        description,
        returnUrl,
      })
      run('UPDATE payments SET provider_ref = ? WHERE id = ?', id, id)
      res.status(201).json({ payment: common, url: card.url })
    } catch (e) {
      run('DELETE FROM payments WHERE id = ?', id)
      fail(res, 502, e instanceof Error ? e.message : 'The card payment could not start.')
    }
    return
  }

  // M-Pesa: a prompt appears on the person's phone, they enter their PIN
  if (method === 'mpesa') {
    if (!mpesaEnabled()) return fail(res, 400, 'M-Pesa prompts are not available right now.')
    const phone = normalizePhone(str(b.phone, 30))
    if (!phone) return fail(res, 400, 'Enter a valid Safaricom phone number, for example 0712345678.')
    insertPayment(id, user, kind, taskId, 'M-Pesa', null)
    try {
      const prompt = await stkPush({ paymentId: id, phone, amount: mpesaAmount(PRICES[kind]), description: 'Inkwell' })
      run('UPDATE payments SET provider_ref = ? WHERE id = ?', prompt.checkoutRequestId, id)
      res.status(201).json({ payment: common, prompt: true })
    } catch (e) {
      run('DELETE FROM payments WHERE id = ?', id)
      fail(res, 502, e instanceof Error ? e.message : 'M-Pesa could not send the prompt.')
    }
    return
  }

  // Bank transfer, till, paybill or send money: show the instructions and a reference code
  const manual = one<MethodRow>('SELECT * FROM payment_methods WHERE id = ? AND enabled = 1', method)
  if (!manual) return fail(res, 400, 'Choose a payment method.')
  const reference = makeReference()
  insertPayment(id, user, kind, taskId, manual.name, reference)
  res.status(201).json({ payment: common, reference, method: { name: manual.name, instructions: manual.instructions } })
})

// Asks the provider (PayPal, the card gateway or M-Pesa) what happened. Used when the person comes back
// to the website, and repeatedly while they are answering an M-Pesa prompt.
router.post('/:id/capture', async (req, res) => {
  const user = req.user as UserRow
  const id = String(req.params.id)
  const payment = one<PaymentRow>('SELECT * FROM payments WHERE id = ? AND user_id = ?', id, user.id)
  if (!payment || !payment.provider_ref || !ONLINE_METHODS.includes(payment.method ?? '')) return fail(res, 404, 'Payment not found.')

  try {
    res.json(await confirmPayment(payment))
  } catch (e) {
    fail(res, 502, e instanceof Error ? e.message : 'Could not check the payment.')
  }
})

// The person says they paid by bank, till or send money. The admin checks it before unlocking.
router.post('/:id/proof', (req, res) => {
  const user = req.user as UserRow
  const id = String(req.params.id)
  const payment = one<PaymentRow>("SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'", id, user.id)
  if (!payment || payment.reference === null) return fail(res, 404, 'Payment not found.')
  if (payment.review !== null) return fail(res, 409, 'You already sent the details for this payment.')
  const note = str(bodyOf(req.body).note, 500)
  if (note.length < 3) return fail(res, 400, 'Add the transaction code or the sender name so we can find your payment.')

  run("UPDATE payments SET proof = ?, review = 'submitted' WHERE id = ?", note, id)
  alertAdmins(
    'A payment is waiting for review',
    `${user.name} says they paid ${payment.amount} ${payment.currency} by ${payment.method}. Reference ${payment.reference}. Details: ${note}`,
  )
  res.json({ ok: true })
})

// Testing only (PAYMENT_MODE=demo): anyone can "pay".
router.post('/:id/confirm-demo', (req, res) => {
  if (config.pay.mode !== 'demo') return fail(res, 404, 'Not found.')
  const user = req.user as UserRow
  const id = String(req.params.id)
  const payment = one<PaymentRow>("SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending' AND method = 'Demo'", id, user.id)
  if (!payment) return fail(res, 404, 'Payment not found.')
  const result = applyPayment(id)
  const fresh = one<UserRow>('SELECT * FROM users WHERE id = ?', user.id) as UserRow
  res.json({ ok: true, claimed: result.claimed, user: userOut(fresh) })
})

export default router