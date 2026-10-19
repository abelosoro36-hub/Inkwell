import { useCallback, useEffect, useState } from 'react'

// A small message that appears for a few seconds.
export function useToast() {
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)

  const notify = useCallback((text: string) => setToast({ text, id: Date.now() }), [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  return { toast, notify }
}