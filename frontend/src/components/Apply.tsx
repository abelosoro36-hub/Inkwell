import { useState } from 'react'
import type { FormEvent } from 'react'
import { errMsg } from '../api'
import { useAuth } from '../authContext'

type Mode = 'writer' | 'client'
const EMPTY = { name: '', email: '', phone: '', password: '', company: '', need: '' }

// Create a real account. Writers start free; clients wait for admin approval.
export default function Apply() {
  const { user, register } = useAuth()
  const [mode, setMode] = useState<Mode>('writer')
  const [f, setF] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ name: f.name, email: f.email, phone: f.phone, password: f.password, role: mode, company: f.company, need: f.need })
      setF(EMPTY)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section alt" id="join">
      <div className="section-head">
        <h2>Join Inkwell</h2>
        <p>Create a free account as a writer, or tell us what your business needs written.</p>
      </div>

      {user ? (
        <p className="sent">
          ✓ You are signed in as {user.name}.
          {user.role === 'client' && user.approval !== 'approved' ? ' Your client account is waiting for admin approval.' : ''}
          {user.role === 'writer' ? ' Activate your account to start claiming tasks.' : ''}
        </p>
      ) : (
        <>
          <div className="filters" role="tablist">
            <button role="tab" aria-selected={mode === 'writer'} className={`filter ${mode === 'writer' ? 'active' : ''}`} onClick={() => setMode('writer')}>I’m a writer</button>
            <button role="tab" aria-selected={mode === 'client'} className={`filter ${mode === 'client' ? 'active' : ''}`} onClick={() => setMode('client')}>I need writing</button>
          </div>

          <form className="apply-form" onSubmit={submit}>
            <label>Your name<input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></label>
            <label>Email<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></label>
            <label>
              Primary phone number (used to recover your password)
              <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0712345678" autoComplete="tel" />
            </label>
            <label>Password (8 or more characters)<input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></label>
            {mode === 'client' && (
              <>
                <label>Company<input value={f.company} onChange={(e) => set('company', e.target.value)} /></label>
                <label>What do you need written?<textarea value={f.need} onChange={(e) => set('need', e.target.value)} /></label>
              </>
            )}
            {error && <p className="wrong">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create free account'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}