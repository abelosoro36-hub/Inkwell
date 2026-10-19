import type { JobRow, SubRow, UserRow } from './types'

// Turns database rows into the objects the website receives.
// The password hash never leaves the server.
export const userOut = (u: UserRow) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  plan: u.plan,
  sample: u.sample,
  sampleNote: u.sample_note,
  company: u.company,
  need: u.need,
  approval: u.approval,
  emailVerified: u.email_verified === 1,
  createdAt: u.created_at,
})

export const jobOut = (j: JobRow) => ({
  id: j.id,
  title: j.title,
  client: j.client,
  type: j.type,
  pay: j.pay,
  words: j.words,
  due: j.due,
  premium: j.premium === 1,
  status: j.status,
  claimedBy: j.claimed_by,
  createdAt: j.created_at,
})

export const subOut = (s: SubRow) => ({
  id: s.id,
  jobId: s.job_id,
  jobTitle: s.job_title,
  writerId: s.writer_id,
  writer: s.writer_name,
  words: s.words,
  text: s.text,
  status: s.status,
  note: s.note,
  createdAt: s.created_at,
})

// Submissions together with the job title and the writer's name.
export const SUB_SELECT = `
  SELECT s.*, j.title AS job_title, u.name AS writer_name
  FROM submissions s
  JOIN jobs j ON j.id = s.job_id
  JOIN users u ON u.id = s.writer_id`