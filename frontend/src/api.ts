// Everything the website says to the backend goes through this file.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'
const TOKEN_KEY = 'inkwell-token'

// The address of the public website. The admin site uses it for its "Public site" links.
export const CLIENT_URL = ((import.meta.env.VITE_CLIENT_URL as string | undefined) ?? 'http://localhost:5173').replace(/\/+$/, '')

export type Plan = 'free' | 'active' | 'review' | 'eligible' | 'premium'
export type Role = 'writer' | 'client' | 'admin'
export type WorkStatus = 'pending' | 'approved' | 'revision' | 'rejected'

export interface ApiUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  plan: Plan
  sample: string | null
  sampleNote: string | null
  company: string | null
  need: string | null
  approval: 'pending' | 'approved' | 'rejected' | null
  emailVerified: boolean
  createdAt: number
}

export interface ApiJob {
  id: string
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium: boolean
  status: 'open' | 'closed' | 'pending'
  taken?: boolean
  claimedBy?: string | null
  createdAt: number
}

export interface ApiSub {
  id: string
  jobId: string
  jobTitle: string
  writerId: string
  writer: string
  words: number
  text: string
  status: WorkStatus
  note: string | null
  createdAt: number
}

export interface WorkData {
  plan: Plan
  tasks: ApiJob[]
  submissions: ApiSub[]
  earned: number
}

export interface RegisterBody {
  name: string
  email: string
  phone: string
  password: string
  role: 'writer' | 'client'
  company?: string
  need?: string
}

export interface JobPayload {
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium: boolean
}

export interface Overview {
  openJobs: number
  clientsWaiting: number
  samplesWaiting: number
  workToReview: number
}

// ----- payments -----
export interface PayConfig {
  currency: string
  prices: { activate: number; premium: number }
  mode: 'demo' | 'live'
}

export interface PayMethod {
  id: string
  name: string
  instructions: string
}

export interface PayOptions extends PayConfig {
  paypal: boolean
    // Card payment on its own gateway (not PayPal). The amounts are in the card currency. null = switched off.
  card: { currency: string; amount: { activate: number; premium: number } } | null
  // M-Pesa prompt on the phone. The amounts are in Kenyan shillings. null = switched off.
  mpesa: { amount: { activate: number; premium: number } } | null
  methods: PayMethod[]
}

export interface CheckoutResult {
  payment: { id: string; kind: string; amount: number; currency: string }
  url?: string
  reference?: string
  method?: { name: string; instructions: string }
  prompt?: boolean
  mode?: string
}

export interface CaptureResult {
  status: 'paid' | 'pending' | 'failed'
  claimed: boolean
  message?: string
}

export interface AdminPayment {
  id: string
  kind: 'activate' | 'premium'
  amount: number
  currency: string
  method: string
  status: 'pending' | 'paid'
  reference: string | null
  proof: string | null
  review: 'submitted' | 'rejected' | null
  reviewNote: string | null
  userName: string
  userEmail: string
  createdAt: number
}

export interface AdminMethod {
  id: string
  name: string
  instructions: string
  enabled: boolean
}

export interface ReceivedPayment {
  id: string
  payer: string
  jobTitle: string | null
  method: string
  amount: number
  currency: string
  reference: string | null
  note: string | null
  createdAt: number
}

export interface ReceivedBody {
  payer: string
  amount: number
  method: string
  reference: string
  note: string
  jobId: string
}

interface AuthResult {
  token: string
  user: ApiUser
}

// How many tasks each plan can hold. The server enforces this; the site only shows it.
export const LIMIT: Record<Plan, number> = { free: 0, active: 3, review: 3, eligible: 3, premium: 10 }
export const JOB_TYPES = ['Blog', 'Copywriting', 'Email', 'Case study', 'Whitepaper', 'Editing']

// 10 -> "$10.00" style text in the right currency
export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage blocked
  }
}

export class ApiError extends Error {
  status: number
  needsPayment: boolean

  constructor(message: string, status: number, needsPayment = false) {
    super(message)
    this.status = status
    this.needsPayment = needsPayment
  }
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.')

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string; needsPayment?: boolean }
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong.', res.status, Boolean(data.needsPayment))
  return data as T
}

export const api = {
  config: () => request<PayConfig>('GET', '/config'),

  register: (b: RegisterBody) => request<AuthResult>('POST', '/auth/register', b),
  // identifier = email or phone number
  login: (identifier: string, password: string) => request<AuthResult>('POST', '/auth/login', { identifier, password }),
  me: () => request<{ user: ApiUser }>('GET', '/auth/me'),
  setPhone: (phone: string, password: string) => request<{ user: ApiUser }>('POST', '/auth/phone', { phone, password }),

  forgotPassword: (identifier: string) =>
    request<{ ok: boolean; via: 'sms' | 'email' }>('POST', '/auth/forgot-password', { identifier }),
  resetWithCode: (phone: string, code: string, password: string) =>
    request('POST', '/auth/reset-with-code', { phone, code, password }),
  resetPassword: (token: string, password: string) => request('POST', '/auth/reset-password', { token, password }),

  jobs: () => request<{ jobs: ApiJob[] }>('GET', '/jobs'),
  claim: (id: string) => request('POST', `/jobs/${id}/claim`, {}),
  release: (id: string) => request('POST', `/jobs/${id}/release`, {}),
  submit: (id: string, text: string) => request('POST', `/jobs/${id}/submit`, { text }),

  work: () => request<WorkData>('GET', '/me/work'),
  sendSample: (text: string) => request('POST', '/me/sample', { text }),

  payOptions: () => request<PayOptions>('GET', '/payments/options'),
  checkout: (kind: 'activate' | 'premium', method: string, taskId?: string, phone?: string) =>
    request<CheckoutResult>('POST', '/payments/checkout', { kind, method, taskId, phone }),
  capture: (id: string) => request<CaptureResult>('POST', `/payments/${id}/capture`, {}),
  submitProof: (id: string, note: string) => request('POST', `/payments/${id}/proof`, { note }),
  confirmDemo: (id: string) => request<{ ok: boolean; claimed: boolean }>('POST', `/payments/${id}/confirm-demo`, {}),

  admin: {
    overview: () => request<Overview>('GET', '/admin/overview'),
    jobs: () => request<{ jobs: ApiJob[] }>('GET', '/admin/jobs'),
    saveJob: (id: string | null, p: JobPayload) =>
      id ? request('PUT', `/admin/jobs/${id}`, p) : request('POST', '/admin/jobs', p),
    setJobStatus: (id: string, status: 'open' | 'closed') => request('PATCH', `/admin/jobs/${id}/status`, { status }),
    deleteJob: (id: string) => request('DELETE', `/admin/jobs/${id}`),
    clients: () => request<{ clients: ApiUser[] }>('GET', '/admin/clients'),
    setClient: (id: string, status: 'approved' | 'rejected') => request('PATCH', `/admin/clients/${id}`, { status }),
    writers: () => request<{ writers: ApiUser[] }>('GET', '/admin/writers'),
    reviewWriter: (id: string, action: 'approve_sample' | 'reject_sample', note: string) =>
      request('PATCH', `/admin/writers/${id}`, { action, note }),
    grant: (id: string, plan: 'active' | 'premium') => request('POST', `/admin/writers/${id}/grant`, { plan }),
    resetPassword: (id: string) => request<{ password: string }>('POST', `/admin/users/${id}/reset-password`, {}),
    submissions: () => request<{ submissions: ApiSub[] }>('GET', '/admin/submissions'),
    reviewWork: (id: string, status: 'approved' | 'revision' | 'rejected', note: string) =>
      request('PATCH', `/admin/submissions/${id}`, { status, note }),

    payments: () => request<{ payments: AdminPayment[] }>('GET', '/admin/payments'),
    approvePayment: (id: string) => request('POST', `/admin/payments/${id}/approve`, {}),
    rejectPayment: (id: string, note: string) => request('POST', `/admin/payments/${id}/reject`, { note }),
    methods: () => request<{ methods: AdminMethod[] }>('GET', '/admin/payment-methods'),
    saveMethod: (id: string | null, m: { name: string; instructions: string; enabled: boolean }) =>
      id ? request('PUT', `/admin/payment-methods/${id}`, m) : request('POST', '/admin/payment-methods', m),
    deleteMethod: (id: string) => request('DELETE', `/admin/payment-methods/${id}`),
    received: () => request<{ received: ReceivedPayment[] }>('GET', '/admin/received'),
    addReceived: (b: ReceivedBody) => request('POST', '/admin/received', b),
  },
}