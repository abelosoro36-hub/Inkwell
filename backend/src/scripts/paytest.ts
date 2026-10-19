import { config } from '../config'
import { cardEnabled, cardPing } from '../payments/cards'
import { mpesaEnabled, mpesaPing } from '../payments/mpesa'
import { paypalEnabled, paypalPing } from '../payments/paypal'

// Checks every payment key in backend/.env and says what is wrong.
// Usage (from the backend folder):  npm run pay:test

async function check(name: string, enabled: boolean, ping: () => Promise<unknown>): Promise<void> {
  if (!enabled) {
    console.log(`${name}: OFF (the keys are empty or still placeholders in backend/.env)`)
    return
  }
  try {
    await ping()
    console.log(`${name}: OK, the keys are accepted`)
  } catch (e) {
    console.log(`${name}: FAILED`)
    console.log(`   ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function main(): Promise<void> {
  console.log(`Payment mode: ${config.pay.mode}`)
  console.log(`PayPal environment: ${config.pay.paypal.live ? 'LIVE (real money)' : 'SANDBOX (only PayPal test accounts can pay)'}`)
  console.log(`M-Pesa environment: ${config.pay.mpesa.live ? 'LIVE (real money)' : 'SANDBOX (pretend payments only)'}`)
  console.log(`Card gateway: ${config.pay.card.provider || 'none chosen'}\n`)

  await check('PayPal', paypalEnabled(), paypalPing)
  await check(`Card (${config.pay.card.provider || 'no gateway'})`, cardEnabled(), cardPing)
  await check('M-Pesa prompt', mpesaEnabled(), mpesaPing)
}

main().catch((e: unknown) => {
  console.error('The check failed:', e)
  process.exit(1)
})