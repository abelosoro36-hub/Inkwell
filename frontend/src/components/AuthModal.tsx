import { useState } from 'react'
import ForgotForm from './ForgotForm'
import LoginForm from './LoginForm'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin')

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'signin' ? 'Sign in' : 'Reset your password'}</h3>
        {mode === 'signin' ? (
          <>
            <LoginForm onDone={onClose} onForgot={() => setMode('forgot')} />
            <p className="muted">
              No account yet? <a href="#join" className="link" onClick={onClose}>Create one free</a>
            </p>
          </>
        ) : (
          <ForgotForm onBack={() => setMode('signin')} />
        )}
      </div>
    </div>
  )
}