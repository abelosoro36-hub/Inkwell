import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'
import { SCHEMA } from './schema'

// Opens (or creates) the database file, then makes sure all tables exist.
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true })
export const db = new DatabaseSync(config.dbFile)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')
db.exec(SCHEMA)

type Param = string | number | null

/** One row, or undefined. */
export const one = <T>(sql: string, ...p: Param[]): T | undefined => db.prepare(sql).get(...p) as unknown as T | undefined

/** Many rows. */
export const all = <T>(sql: string, ...p: Param[]): T[] => db.prepare(sql).all(...p) as unknown as T[]

/** INSERT / UPDATE / DELETE. */
export const run = (sql: string, ...p: Param[]) => db.prepare(sql).run(...p)

/** Runs several steps as one unit. If anything throws, nothing is saved. */
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

// Upgrades a database created by an older version: adds columns that are missing.
function addColumn(table: string, column: string, definition: string): void {
  const columns = all<{ name: string }>(`PRAGMA table_info(${table})`)
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

addColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'phone', 'TEXT')
addColumn('payments', 'method', 'TEXT')
addColumn('payments', 'currency', 'TEXT')
addColumn('payments', 'reference', 'TEXT')
addColumn('payments', 'proof', 'TEXT')
addColumn('payments', 'review', 'TEXT')
addColumn('payments', 'review_note', 'TEXT')

// Each phone number can belong to one account only (accounts without a phone are not affected).
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL')

// Email verification was removed, so everyone counts as verified.
run('UPDATE users SET email_verified = 1 WHERE email_verified = 0')