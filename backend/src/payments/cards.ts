import { config } from '../config'

const card = config.pay.card

export const cardEnabled = (): boolean => card.provider !== '' && card.secretKey !== '' && card.rate > 0

// What the person is charged on the card, in the card currency (whole units, rounded up).
export const cardAmount = (price: number): number => Math.ceil(price * card.rate)

const headers = () => ({ Authorization: `Bearer ${card.secretKey}`, 'Content-Type': 'application/json' })

interface CardInput {
  paymentId: string
  email: string
  name: string
  amount: number
  currency: string
  description: string
  returnUrl: string
}

// Starts a card-only payment on the gateway's own secure page. The person comes back to the website afterwards.
export async function createCardPayment(o: CardInput): Promise<{ url: string }> {
  if (card.provider === 'paystack') {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: o.email,
        amount: Math.round(o.amount * 100),
        currency: o.currency,
        reference: o.paymentId,
        callback_url: o.returnUrl,
        channels: ['card'],
        metadata: { paymentId: o.paymentId },
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { authorization_url?: string } }
    if (!res.ok || !data.status || !data.data?.authorization_url) {
      throw new Error(`The card payment could not start (${data.message ?? res.status}).`)
    }
    return { url: data.data.authorization_url }
  }

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      tx_ref: o.paymentId,
      amount: o.amount,
      currency: o.currency,
      redirect_url: o.returnUrl,
      payment_options: 'card',
      customer: { email: o.email, name: o.name },
      customizations: { title: 'Inkwell', description: o.description },
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } }
  if (!res.ok || data.status !== 'success' || !data.data?.link) {
    throw new Error(`The card payment could not start (${data.message ?? res.status}).`)
  }
  return { url: data.data.link }
}

// Asks the card gateway what happened, so the answer comes from the gateway and never from the browser.
export async function verifyCardPayment(paymentId: string): Promise<{ paid: boolean; amount: number; currency: string }> {
  if (card.provider === 'paystack') {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentId)}`, { headers: headers() })
    const data = (await res.json().catch(() => ({}))) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string } }
    const d = data.data
    return { paid: res.ok && data.status === true && d?.status === 'success', amount: (d?.amount ?? 0) / 100, currency: (d?.currency ?? '').toUpperCase() }
  }

  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(paymentId)}`, { headers: headers() })
  const data = (await res.json().catch(() => ({}))) as { status?: string; data?: { status?: string; amount?: number; currency?: string } }
  const d = data.data
  return { paid: res.ok && data.status === 'success' && d?.status === 'successful', amount: d?.amount ?? 0, currency: (d?.currency ?? '').toUpperCase() }
}

// Used by the check command: proves the secret key is accepted.
export async function cardPing(): Promise<void> {
  const url = card.provider === 'paystack' ? 'https://api.paystack.co/bank?perPage=1' : 'https://api.flutterwave.com/v3/banks/NG'
  let res: Response
  try {
    res = await fetch(url, { headers: headers() })
  } catch {
    throw new Error('Cannot reach the card service. Check your internet connection.')
  }
  if (!res.ok) throw new Error(`The card service refused the key (${res.status}). Check CARD_PROVIDER and CARD_SECRET_KEY.`)
}