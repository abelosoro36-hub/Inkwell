import { useCallback, useEffect, useState } from 'react'
import { api, errMsg } from './api'
import type { ApiJob, Plan, WorkData } from './api'
import { useAuth } from './authContext'

// The task board and the signed-in writer's own work, loaded from the backend.
export function useMarket(notify: (text: string) => void) {
  const { user, refresh } = useAuth()
  const uid = user?.id
  const isWriter = user?.role === 'writer'

  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [work, setWork] = useState<WorkData | null>(null)

  const reload = useCallback(async () => {
    try {
      setJobs((await api.jobs()).jobs)
      setWork(uid && isWriter ? await api.work() : null)
    } catch (e) {
      notify(errMsg(e))
    }
  }, [uid, isWriter, notify])

  useEffect(() => {
    void reload()
  }, [reload])

  // Runs an action, tells the person the result, then refreshes everything.
  const act = useCallback(
    async (fn: () => Promise<unknown>, okText: string): Promise<boolean> => {
      try {
        await fn()
        notify(okText)
        await Promise.all([reload(), refresh()])
        return true
      } catch (e) {
        notify(errMsg(e))
        await reload()
        return false
      }
    },
    [notify, reload, refresh],
  )

  const plan: Plan = user && user.role === 'writer' ? user.plan : 'free'
  const claimedIds = work?.tasks.map((t) => t.id) ?? []
  const doneIds = work?.submissions.filter((s) => s.status === 'approved').map((s) => s.jobId) ?? []

  return {
    jobs,
    work,
    plan,
    claimedIds,
    doneIds,
    slotsUsed: claimedIds.filter((id) => !doneIds.includes(id)).length,
    reload,
    claim: (id: string) => act(() => api.claim(id), 'Task claimed. Find it in My work.'),
    release: (id: string) => act(() => api.release(id), 'Task released.'),
    submit: (id: string, text: string) => act(() => api.submit(id, text), 'Sent for review.'),
    sendSample: (text: string) => act(() => api.sendSample(text), 'Sample sent to the review panel.'),
  }
}

export type Market = ReturnType<typeof useMarket>