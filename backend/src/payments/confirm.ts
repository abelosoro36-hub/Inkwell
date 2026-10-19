import { config } from '../config'
import { alertAdmins } from '../notify'
import type { PaymentRow } from '../types'
import { applyPayment } from './apply'
import { cardAmount, verifyCardPayment } from './cards'
import { stkQuery } from './mpesa'
import { captureAndRead } from './paypal'

export interface ConfirmResult {
  status: 'paid' | 'pending' | 'failed'
  claimed: boolean
  message?: string
}

// Asks the payment provider what really happened, then unlocks the account if the money arrived.
// Used when the person comes back to the website, and by the M-Pesa callback.
// Nothing here ever trusts what the browser says.
export async function confirmPayment(p: PaymentRow): Promise<ConfirmResult> {
  if (p.status === 'paid') return { status: 'paid', claimed: false }
  if (!p.provider_ref) return { status: 'pending', claimed: false }

  let paid = false
  let amountMatches = true

  if (p.method === 'PayPal' || p.method === 'PayPal card') {
    const r = await captureAndRead(p.provider_ref)
    paid = r.paid
    amountMatches = r.amount === p.amount && r.currency === p.currency
  } else if (p.method === 'Card') {
    const r = await verifyCardPayment(p.id)
    paid = r.paid
    amountMatches = r.amount === cardAmount(p.amount) && r.currency === config.pay.card.currency
  } else if (p.method === 'M-Pesa') {
    const r = await stkQuery(p.provider_ref)
    if (r.state === 'failed') return { status: 'failed', claimed: false, message: r.message }
    paid = r.state === 'paid'
  } else {
    return { status: 'pending', claimed: false }
  }

  if (!paid) return { status: 'pending', claimed: false }

  if (!amountMatches) {
    alertAdmins('A payment did not match', `A ${p.method} payment (${p.id}) was for a different amount than expected. Please check it by hand.`)
    return { status: 'failed', claimed: false, message: 'The payment amount did not match. Our team was told and will contact you.' }
  }

  const applied = applyPayment(p.id)
  return { status: 'paid', claimed: applied.claimed }
}