import 'dotenv/config'
import path from 'node:path'

const env = process.env
const clientOrigin = (env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '')
const adminOrigin = (env.ADMIN_ORIGIN ?? 'http://localhost:5180').replace(/\/+$/, '')
const smtpHost = env.SMTP_HOST ?? ''
const smtpReady = smtpHost !== ''
const currency = (env.CURRENCY ?? 'USD').toUpperCase()

const notes: string[] = []

// Example text copied from a guide (PUT-YOUR-..., REPLACE_ME, you@example.com) is never a real value.
const isTemplate = (v: string): boolean =>
  /(put-your|keep-your|replace-with|replace_me|choose-a-strong|paste-the|paste-your|change_me)/i.test(v) || v.trim().toLowerCase() === 'you@example.com'

// For the secret and the admin login: only the exact example texts are rejected.
function secret(name: string): string {
  const v = env[name] ?? ''
  if (isTemplate(v)) {
    notes.push(`${name} still has the example text from the guide, so it is ignored.`)
    return ''
  }
  return v
}

// For payment and SMS keys: anything that looks like a placeholder is treated as empty,
// so a method is never switched on by placeholder text.
function real(name: string): string {
  const v = (env[name] ?? '').trim()
  if (v === '') return ''
  if (isTemplate(v) || /^(your|paste|put|replace|keep|copy|the-|example|xxx|change)/i.test(v) || /(your-|-here|placeholder)/i.test(v)) {
    notes.push(`${name} still has placeholder text, so it is ignored.`)
    return ''
  }
  return v
}

const wholeNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value ?? fallback)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

// "demo" lets anyone activate for free (testing only). Anything else means real payments.
const payMode: 'demo' | 'live' = (env.PAYMENT_MODE ?? 'demo') === 'demo' ? 'demo' : 'live'

const cardWord = (env.CARD_PROVIDER ?? '').trim().toLowerCase()
const cardProvider: '' | 'paystack' | 'flutterwave' = cardWord === 'paystack' || cardWord === 'flutterwave' ? cardWord : ''
const cardCurrency = (env.CARD_CURRENCY ?? currency).trim().toUpperCase()

const smsWord = (env.SMS_PROVIDER ?? '').trim().toLowerCase()
const smsProvider: '' | 'africastalking' | 'twilio' = smsWord === 'africastalking' || smsWord === 'twilio' ? smsWord : ''

export const config = {
  production: env.NODE_ENV === 'production',
  port: Number(env.PORT ?? 4000),
  jwtSecret: secret('JWT_SECRET'),
  // The public website and the admin website. Only these two addresses may talk to the backend.
  clientOrigin,
  adminOrigin,
  // Where the links in emails and payment returns point. Normally the public website.
  appUrl: (env.APP_URL ?? clientOrigin).replace(/\/+$/, ''),
  adminEmail: secret('ADMIN_EMAIL').trim().toLowerCase(),
  adminPassword: secret('ADMIN_PASSWORD'),
  paymentMode: payMode,
  requireVerifiedEmail: false,
  dbFile: env.DB_FILE ?? path.join(process.cwd(), 'data', 'inkwell.db'),
  smtp: {
    host: smtpHost,
    port: Number(env.SMTP_PORT ?? 587),
    user: env.SMTP_USER ?? '',
    pass: env.SMTP_PASS ?? '',
    from: env.MAIL_FROM ?? 'Inkwell <no-reply@localhost>',
  },
  sms: {
    provider: smsProvider,
    defaultCountryCode: (env.DEFAULT_COUNTRY_CODE ?? '').replace(/\D/g, ''),
    at: {
      live: env.AT_ENV === 'live',
      username: env.AT_USERNAME ?? '',
      apiKey: real('AT_API_KEY'),
      senderId: env.AT_SENDER_ID ?? '',
    },
    twilio: {
      sid: real('TWILIO_SID'),
      token: real('TWILIO_TOKEN'),
      from: env.TWILIO_FROM ?? '',
    },
  },
  pay: {
    mode: payMode,
    currency,
    prices: {
      activate: wholeNumber(env.PRICE_ACTIVATE, 10),
      premium: wholeNumber(env.PRICE_PREMIUM, 15),
    },
    paypal: {
      clientId: real('PAYPAL_CLIENT_ID'),
      secret: real('PAYPAL_SECRET'),
      live: env.PAYPAL_ENV === 'live',
    },
    // Card payments on a card gateway of their own (not PayPal).
    card: {
      provider: cardProvider,
      secretKey: real('CARD_SECRET_KEY'),
      currency: cardCurrency,
      // units of CARD_CURRENCY for 1 unit of CURRENCY. 0 = not set up, which keeps the card button off.
      rate: Number(env.CARD_RATE ?? (cardCurrency === currency ? 1 : 0)),
    },
    mpesa: {
      live: env.MPESA_ENV === 'live',
      key: real('MPESA_CONSUMER_KEY'),
      secret: real('MPESA_CONSUMER_SECRET'),
      type: env.MPESA_TYPE === 'till' ? ('till' as const) : ('paybill' as const),
      shortcode: (env.MPESA_SHORTCODE ?? '').trim(),
      till: (env.MPESA_TILL ?? '').trim(),
      passkey: real('MPESA_PASSKEY'),
      callbackUrl: (env.MPESA_CALLBACK_URL ?? '').trim(),
      // KES per 1 unit of CURRENCY
      rate: Number(env.MPESA_KES_RATE ?? (currency === 'KES' ? 1 : 0)),
    },
  },
}

if (config.jwtSecret.length < 16) {
  throw new Error(
    'Set JWT_SECRET in backend/.env to a long random text (16+ characters). Make one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  )
}
if (config.production && payMode === 'demo') {
  throw new Error('PAYMENT_MODE=demo lets anyone activate for free. Set PAYMENT_MODE=live in production.')
}
if (!smtpReady) {
  console.warn('Email is not set up (SMTP_HOST is empty). Emails will be printed here instead of sent.')
}
if (smsProvider === '') {
  console.warn(
    config.production
      ? 'SMS is not set up, so password recovery by phone will NOT work. Set SMS_PROVIDER (the admin can still give people temporary passwords).'
      : 'SMS is not set up (SMS_PROVIDER is empty). Password reset codes will be printed here instead of sent.',
  )
}
if (smsWord !== '' && smsProvider === '') {
  console.warn(`SMS_PROVIDER "${smsWord}" is not valid. Use africastalking or twilio, or leave it empty.`)
}
if (cardWord !== '' && cardProvider === '') {
  console.warn('CARD_PROVIDER must be paystack or flutterwave, so the card button is off.')
}
for (const n of notes) console.warn(n)