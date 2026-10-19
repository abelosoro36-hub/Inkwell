import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errMsg } from '../api'

interface Props {
  notify: (text: string) => void
  onSaved: () => void
}

// Shown to signed-in people who have no phone number yet (accounts made before phone numbers existed).
export default function PhoneBanner({ notify, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.setPhone(phone, password)
      notify('Phone number saved. You can now use it to recover your password.')
      onSaved()
    } catch (err) {
      notify(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="banner" role="status">
      {!open ? (
        <>
          <span>Add your phone number so you can recover your password if you forget it.</span>
          <button className="btn header-btn" onClick={() => setOpen(true)}>Add phone number</button>
        </>
      ) : (
        <form className="banner-form" onSubmit={save}>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, e.g. 0712345678" aria-label="Phone number" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" aria-label="Your password" autoComplete="current-password" />
          <button className="btn header-btn" type="submit" disabled={busy || !phone.trim() || !password}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      )}
    </div>
  )
}