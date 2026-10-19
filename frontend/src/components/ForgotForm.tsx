import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errMsg } from '../api'

type Step = 'ask' | 'code' | 'emailSent' | 'done'

// Forgot password: type your phone number, get a 6-digit code by SMS, choose a new password.
// (Typing an email sends a reset link instead, which only works once email is connected.)
export default function ForgotForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('ask')
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const ask = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await api.forgotPassword(identifier.trim())
      setStep(r.via === 'email' ? 'emailSent' : 'code')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== again) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await api.resetWithCode(identifier.trim(), code, password)
      setStep('done')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <>
        <p className="sent">Your password was changed. You can sign in now.</p>
        <button className="btn btn-primary" onClick={onBack}>Go to sign in</button>
      </>
    )
  }

  if (step === 'emailSent') {
    return (
      <>
        <p className="sent">If that email has an account, a reset link is on its way. It works for one hour.</p>
        <p className="muted">No email? Go back and type your phone number instead to get a code by SMS.</p>
        <button className="btn" onClick={onBack}>Back to sign in</button>
      </>
    )
  }

  if (step === 'code') {
    return (
      <form className="apply-form login-form" onSubmit={reset}>
        <p className="muted">
          If {identifier.trim()} has an account, we sent a 6-digit code by SMS. It works for 15 minutes.
        </p>
        <label>
          The 6-digit code
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={8} autoComplete="one-time-code" />
        </label>
        <label>
          New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <label>
          Repeat the new password
          <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p className="wrong">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
        <button type="button" className="linklike" onClick={() => setStep('ask')}>Send a new code</button>
        <p className="muted">No code? Contact the Inkwell team and we will give you a temporary password.</p>
      </form>
    )
  }

  return (
    <form className="apply-form login-form" onSubmit={ask}>
      <p className="muted">Type the phone number you used when you signed up. We will text you a code.</p>
      <label>
        Phone number (or email)
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0712345678" autoComplete="username" />
      </label>
      {error && <p className="wrong">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy || !identifier.trim()}>
        {busy ? 'Sending…' : 'Send me a code'}
      </button>
      <button type="button" className="btn" onClick={onBack}>Back to sign in</button>
    </form>
  )
}