import { all } from './db'
import { config } from './config'
import { sendMail } from './mail'
import type { UserRow } from './types'

const link = (query: string): string => `${config.appUrl}/?${query}`

export function sendVerification(user: UserRow, token: string): void {
  void sendMail(user.email, 'Verify your email for Inkwell', {
    title: `Welcome to Inkwell, ${user.name}`,
    lines: [
      'Please confirm your email address to finish setting up your account.',
      'This link works for 24 hours. If you did not sign up, you can ignore this email.',
    ],
    button: { label: 'Verify my email', url: link(`verify=${token}`) },
  })
}

export function sendReset(user: UserRow, token: string): void {
  void sendMail(user.email, 'Reset your Inkwell password', {
    title: 'Reset your password',
    lines: [
      'We received a request to reset your password. This link works for 1 hour and can be used once.',
      'If you did not ask for this, you can ignore this email. Your password stays the same.',
    ],
    button: { label: 'Choose a new password', url: link(`reset=${token}`) },
  })
}

export function notifyPaid(email: string, name: string, kind: 'activate' | 'premium'): void {
  const activate = kind === 'activate'
  void sendMail(email, activate ? 'Your Inkwell account is active' : 'You are now a Premium writer', {
    title: activate ? 'Your account is active' : 'Welcome to Premium',
    lines: [
      `Hi ${name},`,
      activate
        ? 'Your payment was received and your account is active. You can now claim tasks from the task board.'
        : 'Your payment was received. You can now claim up to 10 tasks at once and open premium tasks.',
    ],
    button: { label: 'Open the task board', url: `${config.appUrl}/#tasks` },
  })
}

export function notifyPaymentRejected(email: string, name: string, note: string | null): void {
  const lines = [`Hi ${name},`, 'We could not confirm the payment you reported, so your account has not been unlocked yet.']
  if (note) lines.push(`Note from our team: ${note}`)
  lines.push('You can start a new payment from the website and send the correct details.')
  void sendMail(email, 'We could not confirm your payment', {
    title: 'We could not confirm your payment',
    lines,
    button: { label: 'Open Inkwell', url: `${config.appUrl}/#pricing` },
  })
}

export function notifyWork(
  email: string,
  name: string,
  jobTitle: string,
  status: 'approved' | 'revision' | 'rejected',
  note: string | null,
): void {
  const headline = {
    approved: 'Your work was approved',
    revision: 'Changes were requested on your work',
    rejected: 'Your work was not accepted',
  }[status]
  const lines = [`Hi ${name},`, `${headline}: “${jobTitle}”.`]
  if (note) lines.push(`Note from the reviewer: ${note}`)
  if (status === 'revision' || status === 'rejected') lines.push('You can edit and send it again from My work.')
  void sendMail(email, headline, {
    title: headline,
    lines,
    button: { label: 'Open My work', url: `${config.appUrl}/#mywork` },
  })
}

export function notifySample(email: string, name: string, approved: boolean, note: string | null): void {
  const headline = approved ? 'Your writing sample was approved' : 'Your writing sample needs more work'
  const lines = [`Hi ${name},`, approved ? 'The review panel approved your sample. You can now upgrade to Premium.' : 'The review panel could not approve your sample yet.']
  if (note) lines.push(`Note from the panel: ${note}`)
  void sendMail(email, headline, {
    title: headline,
    lines,
    button: { label: 'Open the review panel', url: `${config.appUrl}/#panel` },
  })
}

export function notifyClient(email: string, name: string, approved: boolean): void {
  const headline = approved ? 'Your Inkwell client account is approved' : 'About your Inkwell client account'
  void sendMail(email, headline, {
    title: headline,
    lines: [
      `Hi ${name},`,
      approved
        ? 'Your client account was approved. Our team will be in touch about your writing needs.'
        : 'We could not approve your client account at this time. Reply to this email if you think this is a mistake.',
    ],
  })
}

// Tells every admin that something needs their attention.
export function alertAdmins(subject: string, line: string): void {
  const admins = all<{ email: string }>("SELECT email FROM users WHERE role = 'admin'")
  for (const a of admins) {
    void sendMail(a.email, subject, {
      title: subject,
      lines: [line],
            button: { label: 'Open the admin panel', url: config.adminOrigin },
    })
  }
}