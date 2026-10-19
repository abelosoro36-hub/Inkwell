import { useEffect, useState } from 'react'

const KEY = 'inkwell-draft'
const SAMPLE =
  'The lighthouse had been dark for eleven years when Mara finally climbed its stairs. Every step answered her with a different note, as if the building remembered every keeper who had come before her.\n\nStart typing here to write your own story...'

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export default function Editor() {
  const [title, setTitle] = useState(() => localStorage.getItem(KEY + '-title') ?? 'The Last Keeper')
  const [text, setText] = useState(() => localStorage.getItem(KEY) ?? SAMPLE)
  const [goal, setGoal] = useState(300)
  const [focus, setFocus] = useState(false)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setSaved(false)
    const t = setTimeout(() => {
      localStorage.setItem(KEY, text)
      localStorage.setItem(KEY + '-title', title)
      setSaved(true)
    }, 600)
    return () => clearTimeout(t)
  }, [text, title])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const words = countWords(text)
  const pct = Math.min(100, Math.round((words / goal) * 100))
  const minutes = Math.max(1, Math.ceil(words / 220))

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${title}\n\n${text}`], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'draft'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="section" id="studio">
      <div className="section-head">
        <h2>Your writing studio</h2>
        <p>This editor works right now. Your draft saves automatically in this browser.</p>
      </div>

      <div className={`editor ${focus ? 'focus' : ''}`}>
        <div className="toolbar">
          <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
          <span className={`save ${saved ? 'ok' : ''}`}>{saved ? '✓ Saved' : 'Saving…'}</span>
          <select value={goal} onChange={(e) => setGoal(Number(e.target.value))} aria-label="Word goal">
            <option value={150}>Goal: 150 words</option>
            <option value={300}>Goal: 300 words</option>
            <option value={1000}>Goal: 1,000 words</option>
          </select>
          <button className="btn" onClick={() => setFocus(!focus)}>{focus ? 'Exit focus' : 'Focus mode'}</button>
          <button className="btn" onClick={download}>Download</button>
        </div>

        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Begin your story…" aria-label="Draft" />

        <div className="statbar">
          <span>{words} words</span>
          <span>{minutes} min read</span>
          <div className="goal" title={`${pct}% of goal`}><div style={{ width: `${pct}%` }} /></div>
          <span>{pct}%{pct >= 100 ? ' 🎉' : ''}</span>
        </div>
      </div>
    </section>
  )
}