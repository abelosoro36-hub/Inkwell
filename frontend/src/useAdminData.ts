import { useCallback, useEffect, useState } from 'react'
import { api, errMsg } from './api'
import type { AdminMethod, AdminPayment, ApiJob, ApiSub, ApiUser, JobPayload, Overview, ReceivedBody, ReceivedPayment } from './api'

// Everything the admin panel shows, loaded from the backend.
export function useAdminData(notify: (text: string) => void) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [clients, setClients] = useState<ApiUser[]>([])
  const [writers, setWriters] = useState<ApiUser[]>([])
  const [submissions, setSubmissions] = useState<ApiSub[]>([])
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [methods, setMethods] = useState<AdminMethod[]>([])
  const [received, setReceived] = useState<ReceivedPayment[]>([])

  const reload = useCallback(async () => {
    try {
      const [o, j, c, w, s, p, m, r] = await Promise.all([
        api.admin.overview(),
        api.admin.jobs(),
        api.admin.clients(),
        api.admin.writers(),
        api.admin.submissions(),
        api.admin.payments(),
        api.admin.methods(),
        api.admin.received(),
      ])
      setOverview(o)
      setJobs(j.jobs)
      setClients(c.clients)
      setWriters(w.writers)
      setSubmissions(s.submissions)
      setPayments(p.payments)
      setMethods(m.methods)
      setReceived(r.received)
    } catch (e) {
      notify(errMsg(e))
    }
  }, [notify])

  useEffect(() => {
    void reload()
  }, [reload])

  const act = useCallback(
    async (fn: () => Promise<unknown>, okText: string): Promise<boolean> => {
      try {
        await fn()
        notify(okText)
        await reload()
        return true
      } catch (e) {
        notify(errMsg(e))
        return false
      }
    },
    [notify, reload],
  )

  return {
    overview,
    jobs,
    clients,
    writers,
    submissions,
    payments,
    methods,
    received,
    saveJob: (id: string | null, p: JobPayload) => act(() => api.admin.saveJob(id, p), 'Job saved.'),
    setJobStatus: (id: string, status: 'open' | 'closed') => act(() => api.admin.setJobStatus(id, status), 'Job updated.'),
    deleteJob: (id: string) => act(() => api.admin.deleteJob(id), 'Job deleted.'),
    setClient: (id: string, status: 'approved' | 'rejected') => act(() => api.admin.setClient(id, status), 'Client updated. They were emailed.'),
    reviewWriter: (id: string, action: 'approve_sample' | 'reject_sample', note: string) =>
      act(() => api.admin.reviewWriter(id, action, note), 'Sample reviewed. The writer was emailed.'),
    grant: (id: string, plan: 'active' | 'premium') =>
      act(() => api.admin.grant(id, plan), 'Payment recorded and the account was unlocked.'),
    // Makes a temporary password for someone who lost theirs. Returns it so it can be shown once.
    resetPassword: async (id: string): Promise<string | null> => {
      try {
        const r = await api.admin.resetPassword(id)
        return r.password
      } catch (e) {
        notify(errMsg(e))
        return null
      }
    },
    reviewWork: (id: string, status: 'approved' | 'revision' | 'rejected', note: string) =>
      act(() => api.admin.reviewWork(id, status, note), 'Work reviewed. The writer was emailed.'),
    approvePayment: (id: string) => act(() => api.admin.approvePayment(id), 'Payment approved. The writer was unlocked and emailed.'),
    rejectPayment: (id: string, note: string) => act(() => api.admin.rejectPayment(id, note), 'Payment rejected. The writer was emailed.'),
    saveMethod: (id: string | null, m: { name: string; instructions: string; enabled: boolean }) =>
      act(() => api.admin.saveMethod(id, m), 'Payment method saved.'),
    deleteMethod: (id: string) => act(() => api.admin.deleteMethod(id), 'Payment method deleted.'),
    addReceived: (b: ReceivedBody) => act(() => api.admin.addReceived(b), 'Payment from the client was recorded.'),
  }
}

export type AdminData = ReturnType<typeof useAdminData>