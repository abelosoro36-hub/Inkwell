import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { one, run } from './db'

const hash = (token: string): string => createHash('sha256').update(token).digest('hex')

// Creates a one-time link token (used by the email reset link). Only the newest link stays valid.
export function createToken(userId: string, kind: 'verify' | 'reset', ttlMs: number): string {
  run('DELETE FROM auth_tokens WHERE user_id = ? AND kind = ?', userId, kind)
  const token = randomBytes(32).toString('hex')
  run(
    'INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    randomUUID(), userId, kind, hash(token), Date.now() + ttlMs, Date.now(),
  )
  return token
}

// Uses a link token once. Returns the person's id, or null if it is wrong, used or expired.
export function consumeToken(token: string, kind: 'verify' | 'reset'): string | null {
  const row = one<{ id: string; user_id: string; expires_at: number; used_at: number | null }>(
    'SELECT id, user_id, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND kind = ?',
    hash(token), kind,
  )
  if (!row || row.used_at !== null || row.expires_at < Date.now()) return null
  run('UPDATE auth_tokens SET used_at = ? WHERE id = ?', Date.now(), row.id)
  return row.user_id
}

// The stored value is tied to the person, so two people can hold the same 6 digits without a clash.
const codeHash = (userId: string, code: string): string => hash(`sms:${userId}:${code}`)

// Creates a 6-digit code for the SMS password reset. Only the newest code stays valid.
export function createCode(userId: string, ttlMs: number): string {
  run("DELETE FROM auth_tokens WHERE user_id = ? AND kind = 'reset'", userId)
  const code = String(randomInt(0, 1000000)).padStart(6, '0')
  run(
    "INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, created_at) VALUES (?, ?, 'reset', ?, ?, ?)",
    randomUUID(), userId, codeHash(userId, code), Date.now() + ttlMs, Date.now(),
  )
  return code
}

// Uses a 6-digit code once. Returns true only if it is right, unused and not expired.
export function consumeCode(userId: string, code: string): boolean {
  const row = one<{ id: string; expires_at: number; used_at: number | null }>(
    "SELECT id, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND kind = 'reset' AND user_id = ?",
    codeHash(userId, code), userId,
  )
  if (!row || row.used_at !== null || row.expires_at < Date.now()) return false
  run('UPDATE auth_tokens SET used_at = ? WHERE id = ?', Date.now(), row.id)
  return true
}