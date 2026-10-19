import { useState } from 'react'
import type { ApiUser, Plan } from '../api'
import type { Theme } from '../useTheme'

const LINKS = [
  { href: '#pricing', label: 'Pricing' },
  { href: '#tasks', label: 'Tasks' },
  { href: '#mywork', label: 'My work' },
  { href: '#panel', label: 'Review panel' },
  { href: '#join', label: 'Join' },
]

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free account',
  active: 'Active',
  review: 'In review',
  eligible: 'Approved',
  premium: 'Premium ★',
}

interface Props {
  user: ApiUser | null
  theme: Theme
  onToggleTheme: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export default function Header({ user, theme, onToggleTheme, onSignIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false)

  let badge: { cls: string; text: string } | null = null
  if (user?.role === 'writer') badge = { cls: user.plan, text: PLAN_LABEL[user.plan] }
  if (user?.role === 'client') badge = { cls: 'review', text: user.approval === 'approved' ? 'Client' : 'Client · pending' }
  if (user?.role === 'admin') badge = { cls: 'premium', text: 'Admin' }

  return (
    <header className="header">
      <a href="#top" className="brand">Ink<span>well</span></a>
      <nav className={`nav ${open ? 'open' : ''}`}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        {badge && <span className={`badge-plan ${badge.cls}`}>{badge.text}</span>}
      </nav>
      <div className="header-tools">
        {user ? (
          <button className="btn header-btn" onClick={onSignOut}>Sign out</button>
        ) : (
          <button className="btn btn-primary header-btn" onClick={onSignIn}>Sign in</button>
        )}
        <button
          className="theme-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="menu-btn" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
      </div>
    </header>
  )
}