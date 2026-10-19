import type { Request, Response } from 'express'
import { one } from '../db'
import { confirmPayment } from '../payments/confirm'
import { bodyOf, str } from '../util'
import type { PaymentRow } from '../types'

// M-Pesa tells us a prompt was answered. Anyone could send fake data to this address, so the
// message is never trusted: we only learn which payment to check, then ask M-Pesa ourselves.
export async function mpesaCallback(req: Request, res: Response): Promise<void> {
  const stk = bodyOf(bodyOf(bodyOf(req.body).Body).stkCallback)
  const checkoutId = str(stk.CheckoutRequestID, 100)
  if (checkoutId) {
    const payment = one<PaymentRow>("SELECT * FROM payments WHERE provider_ref = ? AND method = 'M-Pesa'", checkoutId)
    if (payment) {
      try {
        await confirmPayment(payment)
      } catch (e) {
        console.error('M-Pesa callback failed:', e)
      }
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}