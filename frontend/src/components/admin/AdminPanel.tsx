import { useState } from 'react'
import { CLIENT_URL } from '../../api'
import { useAuth } from '../../authContext'
import { useToast } from '../../useToast'
import { useAdminData } from '../../useAdminData'
import LoginForm from '../LoginForm'
import Toast from '../Toast'
import AdminJobs from './AdminJobs'
import AdminPayments from './AdminPayments'
import AdminRecruit from './AdminRecruit'
import { ClientsTab, SubmissionsTab, WritersTab } from './AdminReview'

type Tab = 'overview' | 'jobs' | 'clients' | 'writers' | 'work' | 'payments' | 'recruit'

function AdminDashboard() {
  const { logout } = useAuth()
  const { toast, notify } = useToast()
  const data = useAdminData(notify)
  const [tab, setTab] = useState<Tab>('overview')

  const o = data.overview
  const pClients = o?.clientsWaiting ?? 0
  const pWriters = o?.samplesWaiting ?? 0
  const pWork = o?.workToReview ?? 0
  const pPay = data.payments.filter((p) => p.status === 'pending' && p.review === 'submitted').length

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'clients', label: `Clients${pClients ? ` (${pClients})` : ''}` },
    { id: 'writers', label: `Writers${pWriters ? ` (${pWriters})` : ''}` },
    { id: 'work', label: `Work${pWork ? ` (${pWork})` : ''}` },
    { id: 'payments', label: `Payments${pPay ? ` (${pPay})` : ''}` },
    { id: 'recruit', label: 'Recruit' },
  ]

  const stats = [
    { label: 'Open jobs', value: o?.openJobs ?? 0, go: 'jobs' as Tab },
    { label: 'Clients waiting', value: pClients, go: 'clients' as Tab },
    { label: 'Samples waiting', value: pWriters, go: 'writers' as Tab },
    { label: 'Work to review', value: pWork, go: 'work' as Tab },
    { label: 'Payments to check', value: pPay, go: 'payments' as Tab },
  ]

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <h1>Inkwell admin</h1>
        <div className="a-actions">
          <a href={CLIENT_URL} className="btn" target="_blank" rel="noreferrer">Public site ↗</a>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      <nav className="filters" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`filter ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="a-stats">
          {stats.map((s) => (
            <button key={s.label} className="card a-stat" onClick={() => setTab(s.go)}>
              <span className="muted">{s.label}</span>
              <b>{s.value}</b>
            </button>
          ))}
        </div>
      )}
      {tab === 'jobs' && <AdminJobs data={data} />}
      {tab === 'clients' && <ClientsTab data={data} />}
      {tab === 'writers' && <WritersTab data={data} />}
      {tab === 'work' && <SubmissionsTab data={data} />}
      {tab === 'payments' && <AdminPayments data={data} />}
      {tab === 'recruit' && <AdminRecruit data={data} />}

      <Toast text={toast?.text} />
    </div>
  )
}

// Only a signed-in admin account (checked by the backend) can see the dashboard.
export default function AdminPanel() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <div className="admin-login"><p className="muted">Loading…</p></div>
  }

  if (!user) {
    return (
      <div className="admin-login">
        <div className="card login-card">
          <h2>Admin sign in</h2>
          <LoginForm />
          <a href={CLIENT_URL} className="muted">← Public site</a>
        </div>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="admin-login">
        <div className="card login-card">
          <h2>Not an admin</h2>
          <p className="muted">{user.email} does not have admin access.</p>
          <button className="btn" onClick={logout}>Sign out</button>
          <a href={CLIENT_URL} className="muted">← Public site</a>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}