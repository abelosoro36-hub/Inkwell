import { useState } from 'react'

const QA = [
  { q: 'Why is there an activation fee?', a: 'A small one-time fee keeps the board for serious writers, so clients get careful work and idle accounts do not hold tasks.' },
  { q: 'Is sign up really free?', a: 'Yes. Creating an account is free. You activate it to claim tasks.' },
  { q: 'How do I get Premium?', a: 'Activate, submit a writing sample, and once the review panel approves it you can upgrade for $15 to take more and higher-paying tasks.' },
]

export default function SupportChat() {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<{ from: 'me' | 'bot'; text: string }[]>([
    { from: 'bot', text: 'Hi! Ask me anything about accounts and tasks 👋' },
  ])

  const ask = (i: number) => setLog((l) => [...l, { from: 'me', text: QA[i].q }, { from: 'bot', text: QA[i].a }])

  return (
    <div className="support">
      {open && (
        <div className="chat" role="dialog" aria-label="Support chat">
          <div className="chat-log">
            {log.map((m, i) => (
              <p key={i} className={`msg ${m.from}`}>{m.text}</p>
            ))}
          </div>
          <div className="chat-qs">
            {QA.map((x, i) => (
              <button key={x.q} onClick={() => ask(i)}>{x.q}</button>
            ))}
          </div>
        </div>
      )}
      <button className="chat-fab" aria-label="Open support chat" onClick={() => setOpen(!open)}>{open ? '✕' : '💬'}</button>
    </div>
  )
}