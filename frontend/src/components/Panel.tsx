import { useState } from 'react'
import { PANEL } from '../data'
import type { Plan } from '../api'
import Portrait from './Portrait'

const STEPS = ['Activate your account', 'Submit a writing sample', 'The panel scores it', 'Unlock Premium']
const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

interface Props {
  signedIn: boolean
  isWriter: boolean
  plan: Plan
  sampleNote: string | null
  onSend: (text: string) => Promise<boolean>
  onPremium: () => void
}

export default function Panel({ signedIn, isWriter, plan, sampleNote, onSend, onPremium }: Props) {
  const [text, setText] = useState('')
  const step = { free: 0, active: 1, review: 2, eligible: 3, premium: 4 }[plan]
  const words = countWords(text)

  const send = async () => {
    const ok = await onSend(text.trim())
    if (ok) setText('')
  }

  let action
  if (!signedIn) action = <p className="muted">Sign in or create a free account to begin.</p>
  else if (!isWriter) action = <p className="muted">The review panel is for writer accounts.</p>
  else if (plan === 'free') action = <p className="muted">Activate your account first to send a sample.</p>
  else if (plan === 'active')
    action = (
      <div className="apply-form">
        {sampleNote && <p className="bubble-note">Panel note: {sampleNote}</p>}
        <label>
          Your writing sample (at least 50 words)
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="work-foot">
          <span className="muted">{words} words</span>
          <button className="btn btn-primary" disabled={words < 50} onClick={send}>Submit sample for review</button>
        </div>
      </div>
    )
  else if (plan === 'review') action = <p className="bubble-note">⏳ The panel is reading your sample…</p>
  else if (plan === 'eligible')
    action = (
      <>
        <p className="bubble-note ok">🎉 Approved by the panel!</p>
        <button className="btn btn-primary" onClick={onPremium}>Upgrade to Premium for $15</button>
      </>
    )
  else action = <p className="bubble-note ok">★ You are a Premium writer.</p>

  return (
    <section className="section" id="panel">
      <div className="section-head">
        <h2>Meet the review panel</h2>
        <p>Real editors read every sample. Pass their review and Premium opens up.</p>
      </div>

      <div className="grid panel-grid">
        {PANEL.map((p) => (
          <article key={p.name} className="card member">
            <Portrait {...p} />
            <h3>{p.name}</h3>
            <p className="muted">{p.role}</p>
          </article>
        ))}
      </div>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <b>{i < step ? '✓' : i + 1}</b>
            {s}
          </li>
        ))}
      </ol>

      <div className="panel-action">{action}</div>
    </section>
  )
}