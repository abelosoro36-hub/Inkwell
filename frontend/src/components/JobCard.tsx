import type { Job } from '../types'
import StatusBadge from './StatusBadge'

function duration(job: Job): string {
  if (!job.startedAt) return '—'
  const secs = ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000
  return `${secs.toFixed(1)}s`
}

interface Props {
  job: Job
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

export default function JobCard({ job, onCancel, onRetry }: Props) {
  const active = job.status === 'queued' || job.status === 'running'

  return (
    <li className="job">
      <div className="job-main">
        <div className="job-title">
          <strong>{job.name}</strong>
          <StatusBadge status={job.status} />
        </div>
        <code className="job-cmd">{job.command}</code>
        <span className="job-meta">
          {job.type} · started {new Date(job.createdAt).toLocaleTimeString()} · took {duration(job)}
        </span>
      </div>
      {active ? (
        <button className="btn" onClick={() => onCancel(job.id)}>Cancel</button>
      ) : (
        <button className="btn" onClick={() => onRetry(job.id)}>Run again</button>
      )}
    </li>
  )
}