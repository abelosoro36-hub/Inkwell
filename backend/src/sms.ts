import { config } from './config'

const { sms } = config

// 0712345678 -> +254712345678 (with DEFAULT_COUNTRY_CODE=254). Numbers that start with + or 00 are kept.
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (s.startsWith('+')) {
    const digits = s.slice(1)
    return /^\d{8,15}$/.test(digits) ? `+${digits}` : null
  }
  if (s.startsWith('0') && sms.defaultCountryCode && /^0\d{8,12}$/.test(s)) {
    return `+${sms.defaultCountryCode}${s.slice(1)}`
  }
  return null
}

async function viaAfricasTalking(to: string, text: string): Promise<void> {
  const base = sms.at.live ? 'https://api.africastalking.com' : 'https://api.sandbox.africastalking.com'
  const body = new URLSearchParams({ username: sms.at.username, to, message: text })
  if (sms.at.senderId) body.set('from', sms.at.senderId)
  const res = await fetch(`${base}/version1/messaging`, {
    method: 'POST',
    headers: { apiKey: sms.at.apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Message?: string; Recipients?: { status?: string; statusCode?: number }[] }
  }
  const r = data.SMSMessageData?.Recipients?.[0]
  const accepted = r !== undefined && ([100, 101, 102].includes(r.statusCode ?? 0) || r.status === 'Success')
  if (!res.ok || !accepted) throw new Error(`Africa's Talking did not send the SMS (${r?.status ?? data.SMSMessageData?.Message ?? res.status}).`)
}

async function viaTwilio(to: string, text: string): Promise<void> {
  const { sid, token, from } = sms.twilio
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: text }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(`Twilio did not send the SMS (${data.message ?? res.status}).`)
  }
}

// Sends a text message. It never throws, so an SMS problem can never break a request.
export async function sendSms(to: string, text: string): Promise<void> {
  try {
    if (sms.provider === 'africastalking') await viaAfricasTalking(to, text)
    else if (sms.provider === 'twilio') await viaTwilio(to, text)
    else console.log(`\n[SMS NOT sent: SMS is not set up]\nTo: ${to}\n${text}\n`)
  } catch (e) {
    console.error(`SMS to ${to} failed:`, e instanceof Error ? e.message : e)
  }
}