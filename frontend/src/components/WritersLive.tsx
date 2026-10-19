import { useEffect, useState } from 'react'
import { WRITERS } from '../data'
import type { Writer } from '../data'

const VERB = { writing: 'is writing', editing: 'is editing', reviewing: 'is reviewing feedback' }

export default function WritersLive() {
  const [writers, setWriters] = useState<Writer[]>(WRITERS)

  useEffect(() => {
    const t = setInterval(() => {
      setWriters((prev) =>
        prev.map((w) => (w.status === 'writing' && Math.random() < 0.7 ? { ...w, words: w.words + 3 + Math.floor(Math.random() * 10) } : w)),
      )
    }, 1500)
    return () => clearInterval(t)
  }, [])

  const total = writers.reduce((s, w) => s + w.words, 0)

  return (
    <section className="section alt" id="writers">
      <div className="section-head">
        <h2>Writers online right now</h2>
        <p><b>{total.toLocaleString()}</b> words written by this group today</p>
      </div>
      <div className="grid writers">
        {writers.map((w) => (
          <article key={w.id} className="card writer">
            <div className="avatar" style={{ background: w.color }}>{w.name[0]}</div>
            <div>
              <h3>{w.name}</h3>
              <p className="muted"><span className={`dot ${w.status}`} />{VERB[w.status]}</p>
              <p className="project">“{w.project}” <span className="tag">{w.genre}</span></p>
              <p className="words">{w.words.toLocaleString()} words today</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}