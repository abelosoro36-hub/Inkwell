export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type JobType = 'shell' | 'http' | 'script'

export interface Job {
  id: string
  name: string
  type: JobType
  command: string
  status: JobStatus
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

export type NewJob = Pick<Job, 'name' | 'type' | 'command'>