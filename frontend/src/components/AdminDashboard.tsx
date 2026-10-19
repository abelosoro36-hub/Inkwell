import type { Job, JobStatus, JobType } from '../types'
import StatusBadge from './StatusBadge'

const STATUSES: JobStatus[] = ['queued', 'running', 'succeeded', 'failed', 'cancelled']
const TYPES: JobType[] = ['shell', 'http', 'script']

interface Props {
  jobs: Job[]
  onCancelAll: () => void
  onClear: () => void
  onRetry: (id: string) => void
}

export default function AdminDashboard({ jobs, onCancelAll, onClear, onRetry }: Props) {
  const count = (s: JobStatus) => jobs.filter((j) => j.status === s).length
  const succeeded = count('succeeded')
  const failed = count('failed')
  const active = count('queued') + count('running')
  const finished = succeeded + failed

  const successRate = finished ? `${Math.round((succeeded / finished) * 100)}%` : '—'

  const timed = jobs.filter((j) => j.startedAt && j.finishedAt && j.status !== 'cancelled')
  const avg = timed.length
    ? `${(timed.reduce((sum, j) => sum + (j.finishedAt! - j.startedAt!), 0) / timed.length / 1000).toFixed(1)}s`
    : '—'

  const recentFailures = jobs.filter((j) => j.status === 'failed').slice(0, 5)
  const total = jobs.length || 1

  const stats = [
    { label: 'Total jobs', value: jobs.length },
    { label: 'Active now', value: active },
    { label: 'Success rate', value: successRate },
    { label: 'Average run time', value: avg },
  ]

  return (
    <div className="admin">
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="panel stat">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <section className="panel">
          <h2>Jobs by status</h2>
          <ul className="bars">
            {STATUSES.map((s) => (
              <li key={s}>
                <span className="bar-label">{s[0].toUpperCase() + s.slice(1)}</span>
                <div className="bar-track">
                  <div className={`bar-fill fill-${s}`} style={{ width: `${(count(s) / total) * 100}%` }} />
                </div>
                <span className="bar-count">{count(s)}</span>
              </li>
            ))}
          </ul>

          <h2 className="sub">Jobs by type</h2>
          <ul className="bars">
            {TYPES.map((t) => {
              const n = jobs.filter((j) => j.type === t).length
              return (
                <li key={t}>
                  <span className="bar-label">{t}</span>
                  <div className="bar-track">
                    <div className="bar-fill fill-type" style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                  <span className="bar-count">{n}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel">
          <h2>Recent failures</h2>
          {recentFailures.length === 0 ? (
            <p className="empty">No failed jobs.</p>
          ) : (
            <ul className="jobs">
              {recentFailures.map((j) => (
                <li key={j.id} className="job">
                  <div className="job-main">
                    <div className="job-title">
                      <strong>{j.name}</strong>
                      <StatusBadge status={j.status} />
                    </div>
                    <code className="job-cmd">{j.command}</code>
                  </div>
                  <button className="btn" onClick={() => onRetry(j.id)}>Run again</button>
                </li>
              ))}
            </ul>
          )}

          <h2 className="sub">Admin actions</h2>
          <div className="actions">
            <button className="btn" onClick={onCancelAll} disabled={active === 0}>
              Cancel all active ({active})
            </button>
            <button className="btn" onClick={onClear} disabled={finished + count('cancelled') === 0}>
              Clear finished jobs
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}