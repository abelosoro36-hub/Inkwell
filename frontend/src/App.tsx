import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Pricing from './components/Pricing'
import Tasks from './components/Tasks'
import Panel from './components/Panel'
import MyWork from './components/MyWork'
import Editor from './components/Editor'
import WritersLive from './components/WritersLive'
import Features from './components/Features'
import Apply from './components/Apply'
import Faq from './components/Faq'
import Footer from './components/Footer'
import Bubbles from './components/Bubbles'
import SupportChat from './components/SupportChat'
import Checkout from './components/Checkout'
import PaymentReturn from './components/PaymentReturn'
import AuthModal from './components/AuthModal'
import ResetPassword from './components/ResetPassword'
import PhoneBanner from './components/PhoneBanner'
import Toast from './components/Toast'
import { useAuth } from './authContext'
import { useConfig } from './useConfig'
import { useMarket } from './useMarket'
import { useTheme } from './useTheme'
import { useToast } from './useToast'

interface Pay {
  kind: 'activate' | 'premium'
  taskId?: string
}

const readParam = (name: string): string | null => new URLSearchParams(window.location.search).get(name)

// The public website for writers and clients. It has no admin screens.
export default function App() {
  const auth = useAuth()
  const { theme, toggle } = useTheme()
  const { toast, notify } = useToast()
  const market = useMarket(notify)
  const pricing = useConfig()
  const [pay, setPay] = useState<Pay | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  // set when the person opens the link from a password reset email
  const [resetToken, setResetToken] = useState<string | null>(() => readParam('reset'))
  // set when PayPal or the card page sends the person back after paying
  const [returnPay, setReturnPay] = useState<string | null>(() => readParam('pay'))

  const refreshUser = auth.refresh
  const handledLink = useRef(false)

  // Tidies the address after a payment return or a reset link, and says so if a payment was cancelled.
  useEffect(() => {
    if (handledLink.current) return
    handledLink.current = true
    const cancelled = readParam('paycancel')
    if (!cancelled && !readParam('reset') && !readParam('pay')) return
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    if (cancelled) notify('Payment cancelled. You were not charged.')
  }, [notify])

  const user = auth.user
  const isWriter = user?.role === 'writer'

  const needAccount = useCallback(() => {
    notify('Create a free account first, then activate it.')
    window.location.hash = '#join'
  }, [notify])

  // No account: sign up first. Free account: pay to activate (the task is claimed after payment).
  // Active account: the task is claimed straight away.
  const claimTask = (id: string) => {
    if (!user) return needAccount()
    if (!isWriter) return notify('Only writer accounts can claim tasks.')
    if (user.plan === 'free') return setPay({ kind: 'activate', taskId: id })
    void market.claim(id)
  }

  const startActivate = () => {
    if (!user) return needAccount()
    if (!isWriter) return notify('Only writer accounts can be activated.')
    setPay({ kind: 'activate' })
  }

  const startPremium = () => {
    if (!isWriter) return notify('Sign in with a writer account first.')
    setPay({ kind: 'premium' })
  }

  // Called when a payment step is finished (paid, or the bank details were sent).
  const paymentFinished = (message: string) => {
    setPay(null)
    setReturnPay(null)
    notify(message)
    void refreshUser()
    void market.reload()
  }

  const payJob = pay?.taskId ? market.jobs.find((j) => j.id === pay.taskId) : undefined

  return (
    <>
      <Bubbles />
      <Header
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onSignIn={() => setLoginOpen(true)}
        onSignOut={auth.logout}
      />
      {user && user.role !== 'admin' && !user.phone && <PhoneBanner notify={notify} onSaved={() => void refreshUser()} />}
      <main>
        <Hero />
        <Pricing
          plan={market.plan}
          activateText={pricing.activateText}
          premiumText={pricing.premiumText}
          onActivate={startActivate}
          onPremium={startPremium}
        />
        <Tasks
          jobs={market.jobs}
          plan={market.plan}
          activateText={pricing.activateText}
          claimedIds={market.claimedIds}
          doneIds={market.doneIds}
          slotsUsed={market.slotsUsed}
          onClaim={claimTask}
          onRelease={(id) => void market.release(id)}
        />
        <MyWork work={market.work} signedIn={Boolean(user)} isWriter={isWriter} onSubmit={market.submit} />
        <Panel
          signedIn={Boolean(user)}
          isWriter={isWriter}
          plan={market.plan}
          sampleNote={user?.sampleNote ?? null}
          onSend={market.sendSample}
          onPremium={startPremium}
        />
        <Editor />
        <WritersLive />
        <Features />
        <Apply />
        <Faq />
      </main>
      <Footer />
      <SupportChat />
      <Toast text={toast?.text} />
      {loginOpen && !user && <AuthModal onClose={() => setLoginOpen(false)} />}
      {resetToken && (
        <ResetPassword
          token={resetToken}
          onCancel={() => setResetToken(null)}
          onDone={() => {
            setResetToken(null)
            auth.logout()
            notify('Password changed. Sign in with your new password.')
            setLoginOpen(true)
          }}
        />
      )}
      {pay && (
        <Checkout
          kind={pay.kind}
          taskId={pay.taskId}
          taskTitle={payJob?.title}
          onClose={() => setPay(null)}
          onFinished={paymentFinished}
        />
      )}
      {returnPay && <PaymentReturn paymentId={returnPay} onFinished={paymentFinished} />}
    </>
  )
}