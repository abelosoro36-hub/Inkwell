import nodemailer from 'nodemailer'
import { config } from './config'

const { smtp } = config

const transporter = smtp.host
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    })
  : null

// When the backend starts, check that the email account really works and say so in the terminal.
if (transporter) {
  transporter
    .verify()
    .then(() => console.log(`Email is ready (connected to ${smtp.host}).`))
    .catch((e: unknown) => console.error('Email connection FAILED:', e instanceof Error ? e.message : e))
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c])

export interface MailContent {
  title: string
  lines: string[]
  button?: { label: string; url: string }
}

function toHtml(c: MailContent): string {
  const paragraphs = c.lines.map((l) => `<p style="margin:0 0 14px;line-height:1.6">${esc(l)}</p>`).join('')
  const button = c.button
    ? `<p style="margin:24px 0"><a href="${esc(c.button.url)}" style="background:#f26a3d;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(c.button.label)}</a></p>` +
      `<p style="font-size:13px;color:#667085">If the button does not work, copy this link into your browser:<br>${esc(c.button.url)}</p>`
    : ''
  return (
    `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:24px;color:#14213d">` +
    `<h2 style="margin:0 0 18px">${esc(c.title)}</h2>${paragraphs}${button}` +
    `<hr style="border:none;border-top:1px solid #e4e7ec;margin:28px 0 12px"><p style="font-size:12px;color:#98a2b3">Inkwell</p></div>`
  )
}

function toText(c: MailContent): string {
  return [c.title, '', ...c.lines, ...(c.button ? ['', `${c.button.label}: ${c.button.url}`] : [])].join('\n')
}

// Sends an email and throws if it fails (used by the test command).
export async function sendMailOrThrow(to: string, subject: string, content: MailContent): Promise<void> {
  if (!transporter) {
    console.log(`\n[email NOT sent: SMTP is not set up]\nTo: ${to}\nSubject: ${subject}\n\n${toText(content)}\n`)
    return
  }
  await transporter.sendMail({ from: smtp.from, to, subject, text: toText(content), html: toHtml(content) })
}

// Sends an email. It never throws, so a mail problem can never break a request.
export async function sendMail(to: string, subject: string, content: MailContent): Promise<void> {
  try {
    await sendMailOrThrow(to, subject, content)
  } catch (e) {
    console.error(`Email to ${to} failed:`, e instanceof Error ? e.message : e)
  }
}