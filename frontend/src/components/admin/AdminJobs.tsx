import { useState } from 'react'
import { JOB_TYPES } from '../../api'
import type { ApiJob } from '../../api'
import type { AdminData } from '../../useAdminData'

interface Draft {
  id: string | null
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium: boolean
}

const EMPTY: Draft = { id: null, title: '', client: '', type: 'Blog', pay: 20, words: 500, due: '3 days', premium: false }
const fromJob = (j: ApiJob): Draft => ({
  id: j.id, title: j.title, client: j.client, type: j.type, pay: j.pay, words: j.words, due: j.due, premium: j.premium,
})

export default function AdminJobs({ data }: { data: AdminData }) {
  const [draft, setDraft] = useState<Draft | null>(null)

  const save = async () => {
    if (!draft || !draft.title.trim() || !draft.client.trim()) return
    const { id, ...payload } = draft
    const ok = await data.saveJob(id, payload)
    if (ok) setDraft(null)
  }

  return (
    <div>
      <div className="a-head">
        <h2>Jobs</h2>
        <button className="btn btn-primary" onClick={() => setDraft({ ...EMPTY })}>+ New job</button>
      </div>

      {draft && (
        <div className="card a-form">
          <h3>{draft.id ? 'Edit job' : 'New job'}</h3>
          <div className="a-fields">
            <label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label>Client<input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} /></label>
            <label>Type
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Pay ($)<input type="number" min={1} value={draft.pay} onChange={(e) => setDraft({ ...draft, pay: Number(e.target.value) })} /></label>
            <label>Words<input type="number" min={50} value={draft.words} onChange={(e) => setDraft({ ...draft, words: Number(e.target.value) })} /></label>
            <label>Due in<input value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></label>
          </div>
          <label className="a-check">
            <input type="checkbox" checked={draft.premium} onChange={(e) => setDraft({ ...draft, premium: e.target.checked })} />
            Premium writers only
          </label>
          <div className="a-actions">
            <button className="btn btn-primary" onClick={save}>Save job</button>
            <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <ul className="a-list">
        {data.jobs.map((j) => (
          <li key={j.id} className="card a-row">
            <div className="a-main">
              <strong>{j.title}</strong>
              <span className="muted">
                {j.client} · {j.type} · {j.words.toLocaleString()} words · ${j.pay} · due in {j.due}
              </span>
            </div>
            <div className="a-tags">
              {j.premium && <span className="st st-revision">premium</span>}
              {j.claimedBy && <span className="st">claimed</span>}
              <span className={`st ${j.status === 'open' ? 'st-approved' : j.status === 'pending' ? 'st-pending' : 'st-rejected'}`}>{j.status}</span>
            </div>
            <div className="a-actions">
              <button className="btn" onClick={() => setDraft(fromJob(j))}>Edit</button>
              <button className="btn" onClick={() => data.setJobStatus(j.id, j.status === 'open' ? 'closed' : 'open')}>
                {j.status === 'open' ? 'Close' : 'Open'}
              </button>
              <button className="btn" onClick={() => data.deleteJob(j.id)}>Delete</button>
            </div>
          </li>
        ))}
        {data.jobs.length === 0 && <li className="empty">No jobs yet. Create the first one.</li>}
      </ul>
    </div>
  )
}