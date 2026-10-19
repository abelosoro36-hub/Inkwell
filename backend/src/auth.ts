import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config'
import { one } from './db'
import { fail } from './util'
import type { Role, UserRow } from './types'

declare global {
  namespace Express {
    interface Request {
      user?: UserRow
    }
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(password, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

// The token carries the person's "token version". Resetting a password raises it,
// which signs the person out of every device that still holds an old token.
export const signToken = (u: UserRow): string =>
  jwt.sign({ sub: u.id, role: u.role, v: u.token_version }, config.jwtSecret, { expiresIn: '7d' })

// Runs before protected routes: reads the token and loads the signed-in user.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return fail(res, 401, 'Please sign in.')
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string; v?: number }
    const user = one<UserRow>('SELECT * FROM users WHERE id = ?', payload.sub)
    if (!user) return fail(res, 401, 'Account not found.')
    if ((payload.v ?? 0) !== user.token_version) return fail(res, 401, 'Session expired. Please sign in again.')
    req.user = user
    next()
  } catch {
    fail(res, 401, 'Session expired. Please sign in again.')
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) return fail(res, 403, 'You are not allowed to do this.')
    next()
  }

// Blocks actions until the person has confirmed their email address (switched off in this version).
export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  const u = req.user
  if (config.requireVerifiedEmail && u && u.role !== 'admin' && u.email_verified !== 1) {
    return fail(res, 403, 'Please verify your email first.', { needsVerification: true })
  }
  next()
}