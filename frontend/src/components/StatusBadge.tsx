import type { JobStatus } from '../types'

const LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>
}