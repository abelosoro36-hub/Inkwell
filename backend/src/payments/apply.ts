import { one, run, tx } from '../db'
import { alertAdmins, notifyPaid } from '../notify'
import { claimProblem } from '../rules'
import type { JobRow, PaymentRow, UserRow } from '../types'

// Marks a payment as paid and unlocks what it paid for. Safe to call twice: the second call does nothing.
// Every payment method (PayPal, bank, demo) ends up here.
export function applyPayment(paymentId: string): { applied: boolean; claimed: boolean } {
  const outcome = tx(() => {
    const payment = one<PaymentRow>('SELECT * FROM payments WHERE id = ?', paymentId)
    if (!payment || payment.status === 'paid') return null
    run("UPDATE payments SET status = 'paid' WHERE id = ?", paymentId)

    let applied = false
    let claimed = false
    const user = one<UserRow>('SELECT * FROM users WHERE id = ?', payment.user_id)

    if (user && payment.kind === 'activate' && user.plan === 'free') {
      run("UPDATE users SET plan = 'active' WHERE id = ?", user.id)
      applied = true
      const job = payment.task_id ? one<JobRow>('SELECT * FROM jobs WHERE id = ?', payment.task_id) : undefined
      const fresh = one<UserRow>('SELECT * FROM users WHERE id = ?', user.id) as UserRow
      if (job && !claimProblem(fresh, job)) {
        run('UPDATE jobs SET claimed_by = ? WHERE id = ?', user.id, job.id)
        claimed = true
      }
    }
    if (user && payment.kind === 'premium' && user.plan === 'eligible') {
      run("UPDATE users SET plan = 'premium' WHERE id = ?", user.id)
      applied = true
    }
    return { applied, claimed, kind: payment.kind, userId: payment.user_id, amount: payment.amount, currency: payment.currency }
  })

  if (!outcome) return { applied: false, claimed: false }

  const person = one<UserRow>('SELECT * FROM users WHERE id = ?', outcome.userId)
  if (person && outcome.applied) notifyPaid(person.email, person.name, outcome.kind)
  if (person && !outcome.applied) {
    alertAdmins(
      'A payment needs your attention',
      `${person.name} paid ${outcome.amount} ${outcome.currency ?? ''} for ${outcome.kind}, but the account had already been updated. A refund may be due.`,
    )
  }
  return { applied: outcome.applied, claimed: outcome.claimed }
}