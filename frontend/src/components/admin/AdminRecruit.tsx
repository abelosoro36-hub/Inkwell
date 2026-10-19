import { useState } from 'react'
import { CLIENT_URL } from '../../api'
import type { AdminData } from '../../useAdminData'

// Numbers and ready-made messages for bringing new writers and clients in.
export default function AdminRecruit({ data }: { data: AdminData }) {
  const [copied, setCopied] = useState('')
  const link = `${CLIENT_URL}/#join`

  const writers = data.writers
  const clients = data.clients
  const stats = [
    { label: 'Writers signed up', value: writers.length },
    { label: 'With a phone number', value: writers.filter((w) => w.phone).length },
    { label: 'Activated', value: writers.filter((w) => w.plan !== 'free').length },
    { label: 'Premium', value: writers.filter((w) => w.plan === 'premium').length },
    { label: 'Clients approved', value: clients.filter((c) => c.approval === 'approved').length },
    { label: 'Open jobs', value: data.jobs.filter((j) => j.status === 'open').length },
  ]

  const messages = [
    {
      id: 'writers',
      label: 'Invite writers',
      text: `Hi! Inkwell is looking for careful writers. Create a free account, activate it with a small one-time fee, and claim real writing tasks. Our review panel checks every sample, and strong writers unlock Premium tasks. Join here: ${link}`,
    },
    {
      id: 'short',
      label: 'Short post',
      text: `Writers wanted: real tasks, a review panel, Premium work for top writers. Free sign up: ${link}`,
    },
    {
      id: 'clients',
      label: 'Invite clients',
      text: `Need articles, product copy, newsletters or editing? Inkwell connects you with vetted writers whose work is reviewed before delivery. Tell us what you need: ${link}`,
    },
  ]

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      window.prompt('Copy this text:', text)
    }
  }

  return (
    <div>
      <div className="a-head"><h2>Recruit</h2></div>

      <div className="a-stats">
        {stats.map((s) => (
          <div key={s.label} className="card a-stat" style={{ cursor: 'default' }}>
            <span className="muted">{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        Share this link: <b>{link}</b>. Only keep jobs open when you really have work for writers to do, because writers pay to claim tasks.
      </p>

      <ul className="a-list">
        {messages.map((m) => (
          <li key={m.id} className="card a-row">
            <div className="a-main">
              <strong>{m.label}</strong>
              <span>{m.text}</span>
            </div>
            <span />
            <button className="btn" onClick={() => copy(m.id, m.text)}>{copied === m.id ? 'Copied ✓' : 'Copy'}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}