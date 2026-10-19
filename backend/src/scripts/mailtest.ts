import { config } from '../config'
import { sendMailOrThrow } from '../mail'

// Usage (from the backend folder):  npm run mail:test -- youraddress@example.com
async function main(): Promise<void> {
  const to = process.argv[2]
  if (!to) {
    console.log('Use: npm run mail:test -- youraddress@example.com')
    return
  }
  if (!config.smtp.host) {
    console.log('SMTP_HOST is empty in backend/.env, so nothing can be sent yet. Fill in the SMTP lines first.')
    return
  }
  await sendMailOrThrow(to, 'Inkwell test email', {
    title: 'Your email setup works',
    lines: [
      'This is a test message from your Inkwell backend.',
      'If you can read this, verification and password reset emails will reach people.',
    ],
    button: { label: 'Open Inkwell', url: config.appUrl },
  })
  console.log(`Test email sent to ${to}. Check the inbox and the Spam folder.`)
}

main().catch((e: unknown) => {
  console.error('The test email FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})