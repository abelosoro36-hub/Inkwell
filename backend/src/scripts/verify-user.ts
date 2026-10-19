import { one, run } from '../db'

// Marks a person's email as verified without needing an email.
// Usage (from the backend folder):  npm run user:verify -- person@example.com
const email = (process.argv[2] ?? '').trim().toLowerCase()

if (!email) {
  console.log('Use: npm run user:verify -- person@example.com')
} else {
  const user = one<{ id: string; name: string }>('SELECT id, name FROM users WHERE email = ?', email)
  if (!user) {
    console.error('No account has that email.')
    process.exit(1)
  }
  run('UPDATE users SET email_verified = 1 WHERE id = ?', user.id)
  console.log(`${user.name} (${email}) is now verified.`)
}