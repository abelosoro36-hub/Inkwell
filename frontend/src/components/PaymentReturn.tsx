import { useEffect, useRef } from 'react'
import { api, errMsg } from '../api'

interface Props {
  paymentId: string
  onFinished: (message: string) => void
}

// Shown when PayPal or Stripe sends the person back to the website. The server asks the provider what happened.
export default function PaymentReturn({ paymentId, onFinished }: Props) {
  const started = useRef(false)
  const done = useRef(onFinished)

  useEffect(() => {
    done.current = onFinished
  })

  useEffect(() => {
    if (started.current) return
    started.current = true
    api
      .capture(paymentId)
      .then((r) => {
        if (r.status === 'paid') {
          done.current(r.claimed ? 'Payment received. Your account is active and your task is claimed.' : 'Payment received. Your account is active.')
        } else if (r.status === 'failed') {
          done.current(r.message ?? 'The payment was not completed.')
        } else {
          done.current('Your payment is still being processed. Refresh this page in a minute.')
        }
      })
      .catch((e: unknown) => done.current(errMsg(e)))
  }, [paymentId])

  return (
    <div className="modal-back">
      <div className="modal" role="dialog" aria-modal="true">
        <h3>Confirming your payment…</h3>
        <p className="muted">Please wait a moment and do not close this page.</p>
      </div>
    </div>
  )
}