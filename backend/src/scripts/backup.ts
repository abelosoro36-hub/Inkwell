import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config'
import { db } from '../db'

// Makes a safe copy of the database. It works while the website is running.
// Usage (from the backend folder):  npm run db:backup
const folder = path.join(path.dirname(config.dbFile), 'backups')
fs.mkdirSync(folder, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = path.join(folder, `inkwell-${stamp}.db`)
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)

console.log(`Backup saved: ${target}`)