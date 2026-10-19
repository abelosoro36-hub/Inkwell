import { useState } from 'react'
import type { Job, JobStatus } from '../types'
import JobCard from './JobCard'

type Filter = 'all' | JobStatus
const FILTERS: Filter[] = ['all', 'queued', 'running', 'succeeded', 'failed', 'cancelled']

interface Props {
  jobs: Job[]
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onClear: () => void
}

export default function JobList({ jobs, onCancel, onRetry, onClear }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)

  return (
    <section className="panel">
      <div className="list-head">
        <h2>Jobs</h2>
        <button className="btn" onClick={onClear}>Clear finished</button>
      </div>

      <div className="filters" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`filter ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {jobs.length === 0 ? 'No jobs yet. Create one to see it run here.' : 'No jobs match this filter.'}
        </p>
      ) : (
        <ul className="jobs">
          {visible.map((job) => (
            <JobCard key={job.id} job={job} onCancel={onCancel} onRetry={onRetry} />
          ))}
        </ul>
      )}
    </section>
  )
}