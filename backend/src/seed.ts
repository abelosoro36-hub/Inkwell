import { randomUUID } from 'node:crypto'
import { config } from './config'
import { checkPassword, hashPassword } from './auth'
import { one, run } from './db'

// Keeps the admin account the same as ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.
// Change them in .env, restart the backend, and the admin account follows.
function syncAdmin(): void {
  const ready = config.adminEmail !== '' && config.adminPassword.length >= 10
  const admin = one<{ id: string; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1",
  )

  if (!ready) {
    if (!admin) console.warn('No admin yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters) in backend/.env')
    else console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is empty or too short in backend/.env, so the admin account was left as it is.')
    return
  }

  if (!admin) {
    if (one('SELECT id FROM users WHERE email = ?', config.adminEmail)) {
      console.error(`${config.adminEmail} already belongs to a normal account. Choose a different ADMIN_EMAIL.`)
      return
    }
    run(
      "INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at) VALUES (?, 'Admin', ?, ?, 'admin', 1, ?)",
      randomUUID(), config.adminEmail, hashPassword(config.adminPassword), Date.now(),
    )
    console.log(`Admin account created for ${config.adminEmail}`)
    return
  }

  const emailDiffers = admin.email !== config.adminEmail
  const passwordDiffers = !checkPassword(config.adminPassword, admin.password_hash)
  if (!emailDiffers && !passwordDiffers) return

  if (one('SELECT id FROM users WHERE email = ? AND id != ?', config.adminEmail, admin.id)) {
    console.error(`${config.adminEmail} already belongs to another account. Choose a different ADMIN_EMAIL.`)
    return
  }
  run(
    'UPDATE users SET email = ?, password_hash = ?, token_version = token_version + 1, email_verified = 1 WHERE id = ?',
    config.adminEmail, passwordDiffers ? hashPassword(config.adminPassword) : admin.password_hash, admin.id,
  )
  console.log(`Admin account updated from backend/.env. Sign in with ${config.adminEmail}.`)
}

// First start only: also add a (switched off) bank transfer template.
// Jobs are posted by the admin, never automatically.
export function seed(): void {
  syncAdmin()

  const methods = one<{ n: number }>('SELECT COUNT(*) AS n FROM payment_methods')
  if ((methods?.n ?? 0) === 0) {
    run(
      "INSERT INTO payment_methods (id, name, instructions, enabled, sort, created_at) VALUES (?, 'Bank transfer', ?, 0, 0, ?)",
      randomUUID(),
      'Bank: (your bank)\nAccount name: (your account name)\nAccount number: (your account number)\nUse the reference code shown here as the payment reference.',
      Date.now(),
    )
    console.log('Added a Bank transfer template. Fill it in and switch it on in the admin panel (Payments tab).')
  }

  const jobs = one<{ n: number }>('SELECT COUNT(*) AS n FROM jobs')
  if ((jobs?.n ?? 0) === 0) {
    console.log('There are no jobs yet. Post jobs from the admin panel.')
  }
}