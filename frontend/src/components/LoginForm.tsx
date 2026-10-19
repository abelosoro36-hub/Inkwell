import { useState } from 'react'
import type { FormEvent } from 'react'
import { errMsg } from '../api'
import { useAuth } from '../authContext'

interface Props {
  onDone?: () => void
  onForgot?: () => void
}

export default function LoginForm({ onDone, onForgot }: Props) {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(identifier.trim(), password)
      onDone?.()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="apply-form login-form" onSubmit={submit}>
      <label>
        Email or phone number
        <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {error && <p className="wrong">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy || !identifier.trim() || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {onForgot && (
        <button type="button" className="linklike" onClick={onForgot}>Forgot your password?</button>
      )}
    </form>
  )
}