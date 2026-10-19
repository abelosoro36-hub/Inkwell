import { useCallback, useEffect, useRef, useState } from 'react'
import type { Job, JobStatus, NewJob } from '../types'

// TODO: when the backend is ready, replace the timers below with fetch()
// calls (POST /jobs, GET /jobs, POST /jobs/:id/cancel) and poll or use SSE.
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const timers = useRef<Map<string, number[]>>(new Map())

  const patch = useCallback((id: string, changes: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...changes } : j)))
  }, [])

  const addJob = useCallback(
    (input: NewJob) => {
      const id = crypto.randomUUID()
      setJobs((prev) => [
        { ...input, id, status: 'queued', createdAt: Date.now() },
        ...prev,
      ])
      const start = window.setTimeout(
        () => patch(id, { status: 'running', startedAt: Date.now() }),
        800,
      )
      const finish = window.setTimeout(() => {
        const status: JobStatus = Math.random() < 0.75 ? 'succeeded' : 'failed'
        patch(id, { status, finishedAt: Date.now() })
      }, 800 + 2000 + Math.random() * 3000)
      timers.current.set(id, [start, finish])
    },
    [patch],
  )

  const cancelJob = useCallback(
    (id: string) => {
      timers.current.get(id)?.forEach(clearTimeout)
      timers.current.delete(id)
      patch(id, { status: 'cancelled', finishedAt: Date.now() })
    },
    [patch],
  )

  // Edit A: cancel every queued or running job at once (used by the admin dashboard)
  const cancelAllActive = useCallback(() => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.status !== 'queued' && j.status !== 'running') return j
        timers.current.get(j.id)?.forEach(clearTimeout)
        timers.current.delete(j.id)
        return { ...j, status: 'cancelled', finishedAt: Date.now() }
      }),
    )
  }, [])

  const retryJob = useCallback(
    (id: string) => {
      setJobs((prev) => {
        const job = prev.find((j) => j.id === id)
        if (job) queueMicrotask(() => addJob(job))
        return prev
      })
    },
    [addJob],
  )

  const clearFinished = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status === 'queued' || j.status === 'running'))
  }, [])

  useEffect(() => {
    const current = timers.current
    return () => current.forEach((t) => t.forEach(clearTimeout))
  }, [])

  // Edit B: cancelAllActive added to the returned values
  return { jobs, addJob, cancelJob, cancelAllActive, retryJob, clearFinished }
}