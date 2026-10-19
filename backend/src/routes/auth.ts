import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { one, run } from '../db'
import { checkPassword, hashPassword, requireAuth, signToken } from '../auth'
import { userOut } from '../models'
import { alertAdmins, sendReset } from '../notify'
import { tooMany } from '../rateLimit'
import { normalizePhone, sendSms } from '../sms'
import { consumeCode, consumeToken, createCode, createToken } from '../tokens'
import { bodyOf, fail, str } from '../util'
import type { UserRow } from '../types'

const router = Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN = 60 * 1000
const HOUR = 60 * MIN

const PHONE_HELP = 'Enter a valid phone number, like 0712345678 or +254712345678. You will use it to recover your password.'

router.post('/register', (req, res) => {
  if (tooMany(`register:${req.ip}`, 10, 15 * MIN)) return fail(res, 429, 'Too many attempts. Try again later.')
  const b = bodyOf(req.body)
  const name = str(b.name, 80)
  const email = str(b.email, 120).toLowerCase()
  const phone = normalizePhone(str(b.phone, 30))
  const password = typeof b.password === 'string' ? b.password : ''
  const role = b.role === 'client' ? 'client' : 'writer'
  const company = str(b.company, 120)
  const need = str(b.need, 1000)

  if (!name) return fail(res, 400, 'Enter your name.')
  if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid email.')
  if (!phone) return fail(res, 400, PHONE_HELP)
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  if (role === 'client' && (!company || !need)) return fail(res, 400, 'Clients must give a company and what they need.')
  if (one('SELECT id FROM users WHERE email = ?', email)) return fail(res, 409, 'That email is already registered.')
  if (one('SELECT id FROM users WHERE phone = ?', phone)) return fail(res, 409, 'That phone number is already registered.')

  const id = randomUUID()
  run(
    'INSERT INTO users (id, name, email, password_hash, role, company, need, approval, phone, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
    id, name, email, hashPassword(password), role,
    role === 'client' ? company : null,
    role === 'client' ? need : null,
    role === 'client' ? 'pending' : null,
    phone,
    Date.now(),
  )
  const user = one<UserRow>('SELECT * FROM users WHERE id = ?', id) as UserRow

  if (role === 'client') alertAdmins('A new client is waiting for approval', `${name} from ${company} just created a client account.`)

  res.status(201).json({ token: signToken(user), user: userOut(user) })
})

// People can sign in with their email or their phone number.
router.post('/login', (req, res) => {
  if (tooMany(`login:${req.ip}`, 15, 15 * MIN)) return fail(res, 429, 'Too many attempts. Wait 15 minutes and try again.')
  const b = bodyOf(req.body)
  const identifier = str(b.identifier ?? b.email, 120).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''

  let user: UserRow | undefined
  if (identifier.includes('@')) {
    user = one<UserRow>('SELECT * FROM users WHERE email = ?', identifier)
  } else {
    const phone = normalizePhone(identifier)
    if (phone) user = one<UserRow>('SELECT * FROM users WHERE phone = ?', phone)
  }

  if (!user || !checkPassword(password, user.password_hash)) return fail(res, 401, 'Wrong email, phone number or password.')
  res.json({ token: signToken(user), user: userOut(user) })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: userOut(req.user as UserRow) })
})

// Add or change the primary phone number (needs the password, so nobody else can swap it).
router.post('/phone', requireAuth, (req, res) => {
  const user = req.user as UserRow
  if (tooMany(`phone:${user.id}`, 5, 15 * MIN)) return fail(res, 429, 'Too many attempts. Try again later.')
  const b = bodyOf(req.body)
  const phone = normalizePhone(str(b.phone, 30))
  const password = typeof b.password === 'string' ? b.password : ''
  if (!phone) return fail(res, 400, PHONE_HELP)
  if (!checkPassword(password, user.password_hash)) return fail(res, 401, 'Your password is not correct.')
  if (one('SELECT id FROM users WHERE phone = ? AND id != ?', phone, user.id)) {
    return fail(res, 409, 'That phone number is already used by another account.')
  }
  run('UPDATE users SET phone = ? WHERE id = ?', phone, user.id)
  res.json({ user: userOut(one<UserRow>('SELECT * FROM users WHERE id = ?', user.id) as UserRow) })
})

// ----- password reset -----
// Phone number: we text a 6-digit code. Email: we send a link (only works once email is connected).
// The answer is the same whether or not the account exists, so nobody can use this to find out who has an account.
router.post('/forgot-password', async (req, res) => {
  if (tooMany(`forgot:${req.ip}`, 8, 15 * MIN)) return fail(res, 429, 'Too many attempts. Try again later.')
  const identifier = str(bodyOf(req.body).identifier ?? bodyOf(req.body).email, 120).toLowerCase()
  const byEmail = identifier.includes('@')

  if (identifier) {
    if (byEmail) {
      const user = one<UserRow>('SELECT * FROM users WHERE email = ?', identifier)
      if (user && !tooMany(`forgot-user:${user.id}`, 3, HOUR)) sendReset(user, createToken(user.id, 'reset', HOUR))
    } else {
      const phone = normalizePhone(identifier)
      const user = phone ? one<UserRow>('SELECT * FROM users WHERE phone = ?', phone) : undefined
      if (user && user.phone && !tooMany(`forgot-user:${user.id}`, 3, HOUR)) {
        const code = createCode(user.id, 15 * MIN)
        await sendSms(user.phone, `Your Inkwell password reset code is ${code}. It works for 15 minutes. If you did not ask for it, ignore this message.`)
      }
    }
  }
  res.json({ ok: true, via: byEmail ? 'email' : 'sms' })
})

router.post('/reset-with-code', (req, res) => {
  if (tooMany(`rc:${req.ip}`, 20, 15 * MIN)) return fail(res, 429, 'Too many attempts. Try again later.')
  const b = bodyOf(req.body)
  const phone = normalizePhone(str(b.phone, 30))
  const code = str(b.code, 12).replace(/\D/g, '')
  const password = typeof b.password === 'string' ? b.password : ''

  // checked first, so a typo does not use up the code
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  const user = phone ? one<UserRow>('SELECT * FROM users WHERE phone = ?', phone) : undefined
  if (!user || code.length !== 6) return fail(res, 400, 'That code is not correct or has expired.')
  if (tooMany(`rc-user:${user.id}`, 5, 15 * MIN)) return fail(res, 429, 'Too many wrong codes. Ask for a new code in a few minutes.')
  if (!consumeCode(user.id, code)) return fail(res, 400, 'That code is not correct or has expired.')

  run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', hashPassword(password), user.id)
  res.json({ ok: true })
})

// The reset link from the email (backup method).
router.post('/reset-password', (req, res) => {
  if (tooMany(`reset:${req.ip}`, 10, 15 * MIN)) return fail(res, 429, 'Too many attempts. Try again later.')
  const b = bodyOf(req.body)
  const token = str(b.token, 200)
  const password = typeof b.password === 'string' ? b.password : ''
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  const userId = token ? consumeToken(token, 'reset') : null
  if (!userId) return fail(res, 400, 'This reset link is invalid or has expired. Ask for a new one.')
  run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', hashPassword(password), userId)
  res.json({ ok: true })
})

export default router