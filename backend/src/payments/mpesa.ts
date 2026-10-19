import { config } from '../config'

const m = config.pay.mpesa
const BASE = m.live ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

export const mpesaEnabled = (): boolean =>
  m.key !== '' && m.secret !== '' && m.shortcode !== '' && m.passkey !== '' && m.callbackUrl !== '' && m.rate > 0 && (m.type === 'paybill' || m.till !== '')

// M-Pesa only takes whole Kenyan shillings.
export const mpesaAmount = (price: number): number => Math.ceil(price * m.rate)

// 0712345678, 712345678, +254712345678 and 254712345678 all become 254712345678.
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  if (/^254[17]\d{8}$/.test(digits)) return digits
  return null
}

// Time in Nairobi (UTC+3), written as YYYYMMDDHHMMSS.
function timestamp(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

const password = (ts: string): string => Buffer.from(`${m.shortcode}${m.passkey}${ts}`).toString('base64')

async function accessToken(): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${Buffer.from(`${m.key}:${m.secret}`).toString('base64')}` },
    })
  } catch {
    throw new Error('Cannot reach Safaricom. Check your internet connection and try again.')
  }
  const text = await res.text()
  let data: { access_token?: string } = {}
  try {
    data = JSON.parse(text) as { access_token?: string }
  } catch {
    // not JSON
  }
  if (!res.ok || !data.access_token) {
    console.error(`M-Pesa sign-in failed (${res.status}):`, text.slice(0, 300))
    throw new Error(
      `M-Pesa refused the keys (${res.status}). Check that MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET come from your ${m.live ? 'live' : 'Sandbox'} app, with no spaces.`,
    )
  }
  return data.access_token
}

// Used by the check command: proves the keys are accepted.
export const mpesaPing = (): Promise<string> => accessToken()

// Sends the "enter your PIN" prompt to the person's phone.
export async function stkPush(o: { paymentId: string; phone: string; amount: number; description: string }): Promise<{ checkoutRequestId: string }> {
  const token = await accessToken()
  const ts = timestamp()
  const till = m.type === 'till'
  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: m.shortcode,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: till ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
      Amount: o.amount,
      PartyA: o.phone,
      PartyB: till ? m.till : m.shortcode,
      PhoneNumber: o.phone,
      CallBackURL: m.callbackUrl,
      AccountReference: `INK${o.paymentId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      TransactionDesc: o.description.slice(0, 13),
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string
    ResponseDescription?: string
    CheckoutRequestID?: string
    errorMessage?: string
  }
  if (!res.ok || String(data.ResponseCode) !== '0' || !data.CheckoutRequestID) {
    console.error('M-Pesa prompt failed:', res.status, JSON.stringify(data).slice(0, 300))
    throw new Error(data.errorMessage ?? data.ResponseDescription ?? 'M-Pesa could not send the prompt.')
  }
  return { checkoutRequestId: data.CheckoutRequestID }
}

const FAILURES: Record<string, string> = {
  '1': 'There is not enough M-Pesa balance.',
  '1032': 'The payment was cancelled on the phone.',
  '1037': 'The prompt on the phone timed out. Please try again.',
  '2001': 'The wrong PIN was entered. Please try again.',
}

// Asks M-Pesa what happened to a prompt. "pending" means the person has not answered yet.
export async function stkQuery(checkoutRequestId: string): Promise<{ state: 'paid' | 'failed' | 'pending'; message: string }> {
  const token = await accessToken()
  const ts = timestamp()
  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: m.shortcode, Password: password(ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
  })
  const data = (await res.json().catch(() => ({}))) as { ResultCode?: string | number; ResultDesc?: string }
  // While the person has not answered yet, M-Pesa replies without a ResultCode.
  if (data.ResultCode === undefined) return { state: 'pending', message: '' }
  const code = String(data.ResultCode)
  if (code === '0') return { state: 'paid', message: '' }
  return { state: 'failed', message: FAILURES[code] ?? data.ResultDesc ?? 'The payment was not completed.' }
}