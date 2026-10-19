import { useState } from 'react'
import type { JobType, NewJob } from '../types'

const HINTS: Record<JobType, string> = {
  shell: 'npm run build',
  http: 'https://example.com/webhook',
  script: 'scripts/cleanup.js',
}

export default function JobForm({ onSubmit }: { onSubmit: (job: NewJob) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<JobType>('shell')
  const [command, setCommand] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !command.trim()) return
    onSubmit({ name: name.trim(), type, command: command.trim() })
    setName('')
    setCommand('')
  }

  return (
    <form className="panel job-form" onSubmit={handleSubmit}>
      <h2>New job</h2>

      <label>
        Job name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly build" />
      </label>

      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value as JobType)}>
          <option value="shell">Shell command</option>
          <option value="http">HTTP request</option>
          <option value="script">Script file</option>
        </select>
      </label>

      <label>
        {type === 'http' ? 'URL' : type === 'script' ? 'Script path' : 'Command'}
        <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder={HINTS[type]} />
      </label>

      <button type="submit" className="btn btn-primary" disabled={!name.trim() || !command.trim()}>
        Run job
      </button>
    </form>
  )
}