import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import { config } from './config'
import { one } from './db'
import { seed } from './seed'
import authRoutes from './routes/auth'
import jobRoutes from './routes/jobs'
import meRoutes from './routes/me'
import paymentRoutes from './routes/payments'
import adminRoutes from './routes/admin'
import adminPaymentRoutes from './routes/adminPayments'
import adminUserRoutes from './routes/adminUsers'
import { mpesaCallback } from './routes/webhooks'

seed()

const app = express()

// Behind a hosting proxy, the real visitor address is in a header. Needed so the
// "too many attempts" limits count each visitor separately instead of everyone together.
if (config.production) app.set('trust proxy', 1)

// Only the public website and the admin website may use this backend.
// While building on your own computer, any local port is allowed too.
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/
const allowedOrigins = [config.clientOrigin, config.appUrl, config.adminOrigin]
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = !origin || allowedOrigins.includes(origin) || (!config.production && LOCAL.test(origin))
      callback(null, allowed)
    },
  }),
)

app.use(express.json({ limit: '300kb' }))

// Health check. It also proves the database is reachable.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: one('SELECT 1 AS up') ? 'connected' : 'down' })
})

// Public: prices and currency, so the website shows the right amounts.
app.get('/api/config', (_req, res) => {
  res.json({ currency: config.pay.currency, prices: config.pay.prices, mode: config.pay.mode })
})

// M-Pesa calls this when someone answers a payment prompt (no sign-in; the payment is re-checked with M-Pesa).
app.post('/api/payments/mpesa/callback', mpesaCallback)

app.use('/api/auth', authRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/me', meRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', adminPaymentRoutes)
app.use('/api/admin', adminUserRoutes)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port} (payments: ${config.pay.mode})`)
})