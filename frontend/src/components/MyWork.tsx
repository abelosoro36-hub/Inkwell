import { useState } from 'react'
import type { WorkData } from '../api'

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

interface Props {
  work: WorkData | null
  signedIn: boolean
  isWriter: boolean
  onSubmit: (jobId: string, text: string) => Promise<boolean>
}

export default function MyWork({ work, signedIn, isWriter, onSubmit }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const send = async (jobId: string) => {
    const text = (drafts[jobId] ?? '').trim()
    if (!text) return
    const ok = await onSubmit(jobId, text)
    if (ok) setDrafts((d) => ({ ...d, [jobId]: '' }))
  }

  let body
  if (!signedIn) {
    body = <p className="empty">Sign in to see your claimed tasks.</p>
  } else if (!isWriter) {
    body = <p className="empty">Only writer accounts have tasks.</p>
  } else if (!work || work.tasks.length === 0) {
    body = (
      <p className="empty">
        You have no claimed tasks yet. <a href="#tasks" className="link">Pick one from the task board.</a>
      </p>
    )
  } else {
    const subs = work.submissions
    body = (
      <>
        <div className="work-stats">
          <div className="work-stat"><b>{work.tasks.length}</b>Claimed tasks</div>
          <div className="work-stat"><b>{subs.filter((s) => s.status === 'pending').length}</b>Waiting for review</div>
          <div className="work-stat"><b>${work.earned}</b>Approved earnings</div>
        </div>

        <div className="grid work-grid">
          {work.tasks.map((j) => {
            const sub = subs.find((s) => s.jobId === j.id)
            const canWrite = !sub || sub.status === 'revision' || sub.status === 'rejected'
            const draft = drafts[j.id] ?? ''
            return (
              <article key={j.id} className="card work-card">
                <div className="work-top">
                  <div>
                    <h3>{j.title}</h3>
                    <p className="muted">{j.client} · about {j.words.toLocaleString()} words · ${j.pay}</p>
                  </div>
                  {sub ? <span className={`st st-${sub.status}`}>{sub.status}</span> : <span className="st">to do</span>}
                </div>

                {sub?.status === 'approved' && <p className="sent">✓ Approved. ${j.pay} added to your earnings.</p>}
                {sub?.status === 'pending' && <p className="muted">Sent for review. The panel will respond soon.</p>}
                {(sub?.status === 'revision' || sub?.status === 'rejected') && (
                  <p className="muted">
                    {sub.status === 'revision' ? 'The panel asked for changes.' : 'The panel rejected this version.'}
                    {sub.note ? ` Note: “${sub.note}”` : ''} Edit and send it again.
                  </p>
                )}

                {canWrite && (
                  <>
                    <textarea
                      value={draft}
                      placeholder="Write or paste your finished piece here…"
                      aria-label={`Work for ${j.title}`}
                      onChange={(e) => setDrafts((d) => ({ ...d, [j.id]: e.target.value }))}
                    />
                    <div className="work-foot">
                      <span className="muted">{countWords(draft)} / {j.words.toLocaleString()} words</span>
                      <button className="btn btn-primary" disabled={!draft.trim()} onClick={() => send(j.id)}>
                        {sub ? 'Resubmit' : 'Submit for review'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <section className="section" id="mywork">
      <div className="section-head">
        <h2>My work</h2>
        <p>Write your claimed tasks here, send them for review and track approval.</p>
      </div>
      {body}
    </section>
  )
}