import type { Response } from 'express'

export const fail = (res: Response, status: number, error: string, extra: object = {}): void => {
  res.status(status).json({ error, ...extra })
}

export const bodyOf = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}

export const str = (v: unknown, max = 5000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

export const countWords = (s: string): number => s.split(/\s+/).filter(Boolean).length