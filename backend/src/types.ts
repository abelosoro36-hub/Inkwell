export type Role = 'writer' | 'client' | 'admin'
export type Plan = 'free' | 'active' | 'review' | 'eligible' | 'premium'

// Rows exactly as they are stored in the database.
export interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  password_hash: string
  role: Role
  plan: Plan
  sample: string | null
  sample_note: string | null
  company: string | null
  need: string | null
  approval: 'pending' | 'approved' | 'rejected' | null
  email_verified: number
  token_version: number
  created_at: number
}

export interface JobRow {
  id: string
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium: number
  status: 'open' | 'closed' | 'pending'
  created_by: string
  claimed_by: string | null
  created_at: number
}

export interface SubRow {
  id: string
  job_id: string
  writer_id: string
  words: number
  text: string
  status: 'pending' | 'approved' | 'revision' | 'rejected'
  note: string | null
  created_at: number
  job_title: string
  writer_name: string
}

export interface PaymentRow {
  id: string
  user_id: string
  kind: 'activate' | 'premium'
  amount: number
  task_id: string | null
  status: 'pending' | 'paid'
  provider_ref: string | null
  created_at: number
  method: string | null
  currency: string | null
  reference: string | null
  proof: string | null
  review: 'submitted' | 'rejected' | null
  review_note: string | null
}

export interface MethodRow {
  id: string
  name: string
  instructions: string
  enabled: number
  sort: number
  created_at: number
}