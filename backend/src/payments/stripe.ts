import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config'

const { stripe } = config.pay

export const stripeEnabled = (): boolean => stripe.secretKey !== ''

const authHeaders = () => ({ Authorization: `Bearer ${stripe.secretKey}` })

interface SessionInput {
  paymentId: string
  email: string
  amount: number
  currency: string
  description: string
  successUrl: string
  cancelUrl: string
}

// Starts a Stripe card payment on Stripe's own page. The person comes back to the website afterwards.
export async function createCheckoutSession(o: SessionInput): Promise<{ sessionId: string; url: string }> {
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    customer_email: o.email,
    client_reference_id: o.paymentId,
    'metadata[paymentId]': o.paymentId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': o.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(Math.round(o.amount * 100)),
    'line_items[0][price_data][product_data][name]': o.description,
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } }
  if (!res.ok || !data.id || !data.url) throw new Error(data.error?.message ?? 'Stripe could not start the payment.')
  return { sessionId: data.id, url: data.url }
}

// Asks Stripe what happened, so the answer comes from Stripe and never from the browser.
export async function retrieveSession(sessionId: string): Promise<{ paid: boolean; amountMinor: number; currency: string }> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: authHeaders() })
  const data = (await res.json().catch(() => ({}))) as {
    payment_status?: string
    amount_total?: number
    currency?: string
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data.error?.message ?? 'Could not check the payment with Stripe.')
  return {
    paid: data.payment_status === 'paid',
    amountMinor: data.amount_total ?? 0,
    currency: (data.currency ?? '').toUpperCase(),
  }
}

const same = (a: string, b: string): boolean => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Reads a Stripe webhook. "invalid" = wrong signature, null = an event we do not need.
export function readWebhook(raw: Buffer, signature: string | undefined): 'invalid' | null | { sessionId: string; paymentId: string } {
  const secret = stripe.webhookSecret
  if (!secret || !signature) return 'invalid'
  const parts = signature.split(',').map((p) => p.split('='))
  const t = parts.find((p) => p[0] === 't')?.[1]
  const signatures = parts.filter((p) => p[0] === 'v1').map((p) => p[1])
  if (!t || signatures.length === 0) return 'invalid'
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return 'invalid'
  const expected = createHmac('sha256', secret).update(`${t}.${raw.toString('utf8')}`).digest('hex')
  if (!signatures.some((s) => same(s, expected))) return 'invalid'

  try {
    const event = JSON.parse(raw.toString('utf8')) as {
      type?: string
      data?: { object?: { id?: string; client_reference_id?: string } }
    }
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return null
    const o = event.data?.object
    if (!o?.id || !o.client_reference_id) return null
    return { sessionId: o.id, paymentId: o.client_reference_id }
  } catch {
    return null
  }
}