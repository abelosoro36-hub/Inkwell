import { randomUUID } from 'node:crypto'
import { one, run } from '../db'

// Usage (from the backend folder):
//   npm run jobs:sample                 adds sample jobs as CLOSED drafts
//   npm run jobs:sample -- --open       adds them already OPEN
//   npm run jobs:remove-demo            deletes unclaimed demo and sample jobs

type Sample = [title: string, client: string, type: string, pay: number, words: number, due: string, premium: number]

const SAMPLES: Sample[] = [
  ['Blog post: 5 ways small teams save time', 'SAMPLE client', 'Blog', 25, 800, '3 days', 0],
  ['Product descriptions for 10 items', 'SAMPLE client', 'Copywriting', 30, 1000, '3 days', 0],
  ['Monthly customer newsletter', 'SAMPLE client', 'Email', 18, 500, '2 days', 0],
  ['Proofread a 2,000-word essay', 'SAMPLE client', 'Editing', 20, 2000, '2 days', 0],
  ['Landing page copy for a new app', 'SAMPLE client', 'Copywriting', 35, 600, '4 days', 0],
  ['Case study: how a shop doubled its orders', 'SAMPLE client', 'Case study', 55, 1500, '5 days', 1],
  ['Whitepaper: trends in online learning', 'SAMPLE client', 'Whitepaper', 120, 3000, '7 days', 1],
  ['Blog series: 3 posts on healthy habits', 'SAMPLE client', 'Blog', 60, 2400, '6 days', 0],
]

const command = process.argv[2]
const open = process.argv.includes('--open')

if (command === 'sample') {
  let added = 0
  for (const [title, client, type, pay, words, due, premium] of SAMPLES) {
    if (one("SELECT id FROM jobs WHERE title = ? AND created_by = 'sample'", title)) continue
    run(
      'INSERT INTO jobs (id, title, client, type, pay, words, due, premium, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), title, client, type, pay, words, due, premium, open ? 'open' : 'closed', 'sample', Date.now(),
    )
    added += 1
  }
  console.log(`Added ${added} sample job(s) as ${open ? 'OPEN' : 'closed drafts'}.`)
  if (!open) console.log('Open them from the admin panel (Jobs tab) after editing them.')
  else console.log('Reminder: writers pay a fee to claim tasks, so only keep jobs open that you really have work for.')
} else if (command === 'remove-demo') {
  const r = run("DELETE FROM jobs WHERE created_by IN ('system', 'sample') AND claimed_by IS NULL")
  console.log(`Removed ${Number(r.changes)} unclaimed demo/sample job(s).`)
} else {
  console.log('Use: npm run jobs:sample   or   npm run jobs:remove-demo')
}