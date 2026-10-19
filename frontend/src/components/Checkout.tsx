import { useEffect, useRef, useState } from 'react'
import { api, errMsg, money } from '../api'
import type { CheckoutResult, PayOptions } from '../api'

interface Props {
  kind: 'activate' | 'premium'
  taskId?: string
  taskTitle?: string
  onClose: () => void
  onFinished: (message: string) => void
}

// Lets the person choose how to pay: PayPal, card, M-Pesa prompt, bank/till/send money, or anything else the admin set up.
export default function Checkout({ kind, taskId, taskTitle, onClose, onFinished }: Props) {
  const [options, setOptions] = useState<PayOptions | null>(null)
  const [manual, setManual] = useState<CheckoutResult | null>(null)
  const [proof, setProof] = useState('')
  const [phone, setPhone] = useState('')
  const [askPhone, setAskPhone] = useState(false)
  // set while we wait for the person to answer the prompt on their phone
  const [waitingFor, setWaitingFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const finished = useRef(onFinished)
  useEffect(() => {
    finished.current = onFinished
  })

  useEffect(() => {
    api.payOptions().then(setOptions).catch((e: unknown) => setError(errMsg(e)))
  }, [])

  // While the prompt is on the phone, ask the server every few seconds whether it was paid.
  useEffect(() => {
    if (!waitingFor) return
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      try {
        const r = await api.capture(waitingFor)
        if (r.status === 'paid') {
          clearInterval(timer)
          finished.current(r.claimed ? 'Payment received. Your account is active and your task is claimed.' : 'Payment received. Your account is active.')
        } else if (r.status === 'failed') {
          clearInterval(timer)
          setWaitingFor(null)
          setError(r.message ?? 'The payment was not completed.')
        } else if (tries >= 30) {
          clearInterval(timer)
          setWaitingFor(null)
          setError('We did not get a confirmation. If money left your account, contact us and send the M-Pesa message.')
        }
      } catch (e) {
        clearInterval(timer)
        setWaitingFor(null)
        setError(errMsg(e))
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [waitingFor])

  const title = kind === 'premium' ? 'Upgrade to Premium' : taskTitle ? `Activate and claim “${taskTitle}”` : 'Activate your account'
  const price = options ? money(options.prices[kind], options.currency) : ''
  const kes = options?.mpesa ? money(options.mpesa.amount[kind], 'KES') : ''
  const cardPrice = options?.card ? money(options.card.amount[kind], options.card.currency) : ''

  const start = async (method: string) => {
    setBusy(true)
    setError('')
    try {
      const r = await api.checkout(kind, method, taskId, method === 'mpesa' ? phone : undefined)
      if (r.url) {
        window.location.href = r.url
        return
      }
      if (r.prompt) {
        setWaitingFor(r.payment.id)
        return
      }
      if (r.mode === 'demo') {
        const d = await api.confirmDemo(r.payment.id)
        onFinished(d.claimed ? 'Account activated and task claimed. See My work.' : 'Account activated. You can claim tasks now.')
        return
      }
      setManual(r)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const sendProof = async () => {
    if (!manual) return
    setBusy(true)
    setError('')
    try {
      await api.submitProof(manual.payment.id, proof)
      onFinished('Thank you! We will check your payment and unlock your account. You will get an email.')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const nothingAvailable =
    options !== null && options.mode === 'live' && !options.paypal && !options.card && !options.mpesa && options.methods.length === 0

  const choosing = options && !manual && !waitingFor && !askPhone

  return (
    <div className="modal-back" onClick={busy || waitingFor ? undefined : onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {options && <p className="price">{price}</p>}
        {!options && !error && <p className="muted">Loading payment options…</p>}

        {choosing && (
          <>
            <p className="muted">Choose how you would like to pay.</p>
            <div className="methods">
              {options.paypal && (
                <button className="method-btn" disabled={busy} onClick={() => start('paypal')}>
                  <b>PayPal</b>
                  <small>Pay with your PayPal account. You return here afterwards.</small>
                </button>
              )}
              {options.card && (
                <button className="method-btn" disabled={busy} onClick={() => start('card')}>
                  <b>Debit or credit card · {cardPrice}</b>
                  <small>Pay with a card on a secure page. No PayPal account is needed.</small>
                </button>
              )}
              {options.mpesa && (
                <button className="method-btn" disabled={busy} onClick={() => setAskPhone(true)}>
                  <b>M-Pesa prompt · {kes}</b>
                  <small>A payment request appears on your phone. Enter your M-Pesa PIN to pay.</small>
                </button>
              )}
              {options.methods.map((m) => (
                <button key={m.id} className="method-btn" disabled={busy} onClick={() => start(m.id)}>
                  <b>{m.name}</b>
                  <small>You pay outside the website, then tell us. We unlock your account once we confirm it.</small>
                </button>
              ))}
              {options.mode === 'demo' && (
                <button className="method-btn" disabled={busy} onClick={() => start('demo')}>
                  <b>Simulate payment</b>
                  <small>Testing only. Nothing is charged.</small>
                </button>
              )}
            </div>
            {nothingAvailable && <p className="muted">No payment methods are available yet. Please contact the Inkwell team.</p>}
          </>
        )}

        {askPhone && !waitingFor && (
          <>
            <p className="muted">Enter the Safaricom number that will pay {kes}. We will send a request to that phone.</p>
            <label className="field">
              Phone number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" inputMode="tel" />
            </label>
          </>
        )}

        {waitingFor && (
          <>
            <p className="bubble-note">📱 Check your phone and enter your M-Pesa PIN.</p>
            <p className="muted">Keep this window open. It updates by itself when the payment goes through.</p>
          </>
        )}

        {manual && manual.method && (
          <>
            <p className="muted">Pay {price} using {manual.method.name}. Follow these steps:</p>
            <div className="pre">{manual.method.instructions}</div>
            <p className="muted">Put this code as the payment reference:</p>
            <div className="refbox">{manual.reference}</div>
            <label className="field">
              After you pay, enter the transaction code or the name on the payment
              <input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="e.g. transaction code, sender name, date" />
            </label>
          </>
        )}

        {error && <p className="wrong">{error}</p>}

        <div className="modal-actions">
          <button
            className="btn"
            disabled={busy || Boolean(waitingFor)}
            onClick={askPhone ? () => setAskPhone(false) : onClose}
          >
            {askPhone ? 'Back' : manual ? 'Close' : 'Cancel'}
          </button>
          {askPhone && !waitingFor && (
            <button className="btn btn-primary" onClick={() => start('mpesa')} disabled={busy || phone.trim().length < 9}>
              {busy ? 'Sending…' : 'Send prompt'}
            </button>
          )}
          {manual && (
            <button className="btn btn-primary" onClick={sendProof} disabled={busy || proof.trim().length < 3}>
              {busy ? 'Sending…' : 'I have paid'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}