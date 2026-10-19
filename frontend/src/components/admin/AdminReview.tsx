import type { ApiUser } from '../../api'
import type { AdminData } from '../../useAdminData'

const pendingFirst = (isPending: boolean) => (isPending ? 0 : 1)

function planClass(plan: string): string {
  if (plan === 'review') return 'st-pending'
  if (plan === 'eligible' || plan === 'premium') return 'st-approved'
  return ''
}

// Asks the admin for an optional note. Returns null if they cancel.
const askNote = (): string | null => window.prompt('Optional note for the writer (leave empty for none):')

// Makes a temporary password and shows it once so the admin can pass it on.
async function resetPassword(data: AdminData, person: ApiUser): Promise<void> {
  if (!window.confirm(`Make a temporary password for ${person.name}? Their old password stops working.`)) return
  const password = await data.resetPassword(person.id)
  if (password) window.prompt(`Temporary password for ${person.name}. Copy it now and send it to them:`, password)
}

export function ClientsTab({ data }: { data: AdminData }) {
  const list = [...data.clients].sort((a, b) => pendingFirst(a.approval === 'pending') - pendingFirst(b.approval === 'pending'))
  return (
    <div>
      <div className="a-head"><h2>Client accounts</h2></div>
      <ul className="a-list">
        {list.map((c) => (
          <li key={c.id} className="card a-row">
            <div className="a-main">
              <strong>{c.name} · {c.company}</strong>
              <span className="muted">{c.email} · {c.phone ?? 'no phone number'}</span>
              <span>“{c.need}”</span>
            </div>
            <span className={`st st-${c.approval ?? 'pending'}`}>{c.approval ?? 'pending'}</span>
            <div className="a-actions">
              <button className="btn btn-primary" disabled={c.approval === 'approved'} onClick={() => data.setClient(c.id, 'approved')}>Approve</button>
              <button className="btn" disabled={c.approval === 'rejected'} onClick={() => data.setClient(c.id, 'rejected')}>Reject</button>
              <button className="btn" onClick={() => resetPassword(data, c)}>Reset password</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="empty">No client accounts yet.</li>}
      </ul>
    </div>
  )
}

export function WritersTab({ data }: { data: AdminData }) {
  const list = [...data.writers].sort((a, b) => pendingFirst(a.plan === 'review') - pendingFirst(b.plan === 'review'))

  const review = (id: string, action: 'approve_sample' | 'reject_sample') => {
    const note = action === 'reject_sample' ? askNote() : ''
    if (note === null) return
    void data.reviewWriter(id, action, note)
  }

  const grant = (w: ApiUser, plan: 'active' | 'premium') => {
    const what = plan === 'active' ? 'activation fee' : 'Premium fee'
    if (!window.confirm(`Only continue if you have already received ${w.name}'s ${what}. Unlock the account now?`)) return
    void data.grant(w.id, plan)
  }

  return (
    <div>
      <div className="a-head"><h2>Writers and samples</h2></div>
      <ul className="a-list">
        {list.map((w) => (
          <li key={w.id} className="card a-row">
            <div className="a-main">
              <strong>{w.name}</strong>
              <span className="muted">{w.email} · {w.phone ?? 'no phone number'}</span>
              {w.plan === 'review' && w.sample && <blockquote>{w.sample}</blockquote>}
            </div>
            <span className={`st ${planClass(w.plan)}`}>{w.plan}</span>
            <div className="a-actions">
              {w.plan === 'review' && (
                <>
                  <button className="btn btn-primary" onClick={() => review(w.id, 'approve_sample')}>Approve sample</button>
                  <button className="btn" onClick={() => review(w.id, 'reject_sample')}>Reject</button>
                </>
              )}
              {w.plan === 'free' && <button className="btn" onClick={() => grant(w, 'active')}>Mark activation paid</button>}
              {w.plan === 'eligible' && <button className="btn" onClick={() => grant(w, 'premium')}>Mark Premium paid</button>}
              <button className="btn" onClick={() => resetPassword(data, w)}>Reset password</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="empty">No writers yet.</li>}
      </ul>
    </div>
  )
}

export function SubmissionsTab({ data }: { data: AdminData }) {
  const list = [...data.submissions].sort((a, b) => pendingFirst(a.status === 'pending') - pendingFirst(b.status === 'pending'))

  const review = (id: string, status: 'approved' | 'revision' | 'rejected') => {
    const note = status === 'approved' ? '' : askNote()
    if (note === null) return
    void data.reviewWork(id, status, note)
  }

  return (
    <div>
      <div className="a-head"><h2>Submitted work</h2></div>
      <ul className="a-list">
        {list.map((s) => (
          <li key={s.id} className="card a-row">
            <div className="a-main">
              <strong>{s.jobTitle}</strong>
              <span className="muted">by {s.writer} · {s.words.toLocaleString()} words</span>
              <blockquote>{s.text.slice(0, 260)}{s.text.length > 260 ? '…' : ''}</blockquote>
            </div>
            <span className={`st st-${s.status}`}>{s.status}</span>
            <div className="a-actions">
              <button className="btn btn-primary" disabled={s.status !== 'pending'} onClick={() => review(s.id, 'approved')}>Approve</button>
              <button className="btn" disabled={s.status !== 'pending'} onClick={() => review(s.id, 'revision')}>Request revision</button>
              <button className="btn" disabled={s.status !== 'pending'} onClick={() => review(s.id, 'rejected')}>Reject</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="empty">No submitted work yet.</li>}
      </ul>
    </div>
  )
}