import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errMsg } from '../api'

interface Props {
  token: string
  onDone: () => void
  onCancel: () => void
}

// Opened from the link in the password reset email.
export default function ResetPassword({ token, onDone, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== again) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      onDone()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-back">
      <div className="modal" role="dialog" aria-modal="true">
        <h3>Choose a new password</h3>
        <form className="apply-form login-form" onSubmit={submit}>
          <label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
          <label>Repeat it<input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></label>
          {error && <p className="wrong">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </form>
      </div>
    </div>
  )
}