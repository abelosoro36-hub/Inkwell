import { randomUUID } from 'node:crypto'
import { config } from '../config'
import { hashPassword } from '../auth'
import { one, run } from '../db'

// Sets the admin account to the ADMIN_EMAIL and ADMIN_PASSWORD from backend/.env.
// Usage (from the backend folder):  npm run admin:set

if (!config.adminEmail || config.adminPassword.length < 10) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10 or more characters) in backend/.env first.')
  process.exit(1)
}

const admin = one<{ id: string }>("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1")
const owner = one<{ id: string }>('SELECT id FROM users WHERE email = ?', config.adminEmail)

if (owner && owner.id !== admin?.id) {
  console.error('That email already belongs to another account. Choose a different ADMIN_EMAIL.')
  process.exit(1)
}

if (admin) {
  run(
    'UPDATE users SET email = ?, password_hash = ?, token_version = token_version + 1, email_verified = 1 WHERE id = ?',
    config.adminEmail, hashPassword(config.adminPassword), admin.id,
  )
  console.log(`Admin account updated. Sign in with ${config.adminEmail}.`)
} else {
  run(
    "INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at) VALUES (?, 'Admin', ?, ?, 'admin', 1, ?)",
    randomUUID(), config.adminEmail, hashPassword(config.adminPassword), Date.now(),
  )
  console.log(`Admin account created for ${config.adminEmail}.`)
}