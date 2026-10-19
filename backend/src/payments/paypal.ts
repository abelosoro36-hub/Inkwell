import { config } from '../config'

const { paypal } = config.pay
const BASE = paypal.live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

export const paypalEnabled = (): boolean => paypal.clientId !== '' && paypal.secret !== ''

async function accessToken(): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${paypal.clientId}:${paypal.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
  } catch {
    throw new Error('Cannot reach PayPal. Check your internet connection.')
  }
  const text = await res.text()
  let data: { access_token?: string } = {}
  try {
    data = JSON.parse(text) as { access_token?: string }
  } catch {
    // not JSON
  }
  if (!res.ok || !data.access_token) {
    console.error(`PayPal sign-in failed (${res.status}):`, text.slice(0, 300))
    throw new Error(
      `PayPal refused the keys (${res.status}). Check that PAYPAL_CLIENT_ID and PAYPAL_SECRET come from the ${paypal.live ? 'Live' : 'Sandbox'} tab, which must match PAYPAL_ENV.`,
    )
  }
  return data.access_token
}

// Used by the check command: proves the keys are accepted.
export const paypalPing = (): Promise<string> => accessToken()

interface OrderInput {
  paymentId: string
  amount: number
  currency: string
  description: string
  returnUrl: string
  cancelUrl: string
}

// Starts a PayPal payment. The person is sent to PayPal to approve it.
export async function createOrder(o: OrderInput): Promise<{ orderId: string; approveUrl: string }> {
  const token = await accessToken()
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': o.paymentId },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: o.paymentId,
          custom_id: o.paymentId,
          description: o.description,
          amount: { currency_code: o.currency, value: o.amount.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Inkwell',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: o.returnUrl,
            cancel_url: o.cancelUrl,
          },
        },
      },
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    message?: string
    links?: { rel: string; href: string }[]
  }
  const link = data.links?.find((l) => l.rel === 'payer-action') ?? data.links?.find((l) => l.rel === 'approve')
  if (!res.ok || !data.id || !link) throw new Error(data.message ?? 'PayPal could not start the payment.')
  return { orderId: data.id, approveUrl: link.href }
}

// Takes the money after the person approved it, then reads the order back from PayPal
// so the result comes from PayPal itself and never from the browser.
export async function captureAndRead(orderId: string): Promise<{ paid: boolean; amount: number; currency: string }> {
  const token = await accessToken()
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const id = encodeURIComponent(orderId)

  // If the order was already captured this simply fails; the read below tells the truth.
  await fetch(`${BASE}/v2/checkout/orders/${id}/capture`, { method: 'POST', headers, body: '{}' }).catch(() => undefined)

  const res = await fetch(`${BASE}/v2/checkout/orders/${id}`, { headers })
  const data = (await res.json().catch(() => ({}))) as {
    status?: string
    purchase_units?: { payments?: { captures?: { status?: string; amount?: { value: string; currency_code: string } }[] } }[]
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
  const paid = res.ok && data.status === 'COMPLETED' && capture?.status === 'COMPLETED'
  return { paid, amount: Number(capture?.amount?.value ?? 0), currency: capture?.amount?.currency_code ?? '' }
}