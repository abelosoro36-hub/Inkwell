const hits = new Map<string, { n: number; reset: number }>()

// Returns true when `key` has done something more than `max` times within `windowMs`.
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()

  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
  }

  const h = hits.get(key)
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs })
    return false
  }
  h.n += 1
  return h.n > max
}