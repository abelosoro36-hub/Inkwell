import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { one, run } from '../db'
import { hashPassword, requireAuth, requireRole } from '../auth'
import { fail } from '../util'
import type { UserRow } from '../types'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function temporaryPassword(): string {
  let s = ''
  for (const b of randomBytes(10)) s += ALPHABET[b % ALPHABET.length]
  return s
}

// For people who lost their password and cannot use SMS or email: the admin makes a temporary one.
// It is shown once. Admin accounts are not included (the admin password lives in backend/.env).
router.post('/users/:id/reset-password', (req, res) => {
  const id = String(req.params.id)
  const user = one<UserRow>("SELECT * FROM users WHERE id = ? AND role != 'admin'", id)
  if (!user) return fail(res, 404, 'Account not found.')
  const password = temporaryPassword()
  run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', hashPassword(password), id)
  res.json({ password })
})

export default router