import { useState } from 'react'
import { money } from '../../api'
import { useConfig } from '../../useConfig'
import type { AdminData } from '../../useAdminData'

interface MethodDraft {
  id: string | null
  name: string
  instructions: string
  enabled: boolean
}

// Ready-made wording. The admin replaces the (brackets) with the real details.
const TEMPLATES: { label: string; name: string; instructions: string }[] = [
  {
    label: 'Bank transfer',
    name: 'Bank transfer',
    instructions:
      'Bank: (bank name)\nAccount name: (account name)\nAccount number: (account number)\nBranch or SWIFT code: (optional)\nUse the reference code shown here as the payment reference.',
  },
  {
    label: 'M-Pesa Till',
    name: 'M-Pesa Till',
    instructions:
      'Open M-Pesa, choose Lipa na M-Pesa, then Buy Goods and Services.\nTill number: (your till number)\nAmount: (amount in KES)\nAfter paying, copy the transaction code from the M-Pesa message and enter it below.',
  },
  {
    label: 'M-Pesa Paybill',
    name: 'M-Pesa Paybill',
    instructions:
      'Open M-Pesa, choose Lipa na M-Pesa, then Pay Bill.\nBusiness number: (your paybill number)\nAccount number: use the reference code shown here\nAmount: (amount in KES)\nAfter paying, copy the transaction code from the M-Pesa message and enter it below.',
  },
  {
    label: 'Send money',
    name: 'Send money',
    instructions:
      'Open M-Pesa and choose Send Money.\nPhone number: (your number)\nName shown: (your name)\nAmount: (amount in KES)\nAfter paying, copy the transaction code from the M-Pesa message and enter it below.',
  },
  {
    label: 'Other',
    name: '',
    instructions: 'Say exactly how to pay and what to include so you can find the payment.',
  },
]

const EMPTY_RECEIVED = { payer: '', amount: '', method: '', reference: '', note: '', jobId: '' }

export default function AdminPayments({ data }: { data: AdminData }) {
  const cfg = useConfig()
  const [draft, setDraft] = useState<MethodDraft | null>(null)
  const [form, setForm] = useState(EMPTY_RECEIVED)

  const waiting = data.payments.filter((p) => p.status === 'pending' && p.review === 'submitted')
  const paid = data.payments.filter((p) => p.status === 'paid')

  const reject = (id: string) => {
    const note = window.prompt('Why are you rejecting this payment? The writer will see your note (optional):')
    if (note === null) return
    void data.rejectPayment(id, note)
  }

  const approve = (id: string, who: string) => {
    if (!window.confirm(`Only continue if the money from ${who} is really in your account. Unlock them now?`)) return
    void data.approvePayment(id)
  }

  const saveMethod = async () => {
    if (!draft || !draft.name.trim() || !draft.instructions.trim()) return
    const ok = await data.saveMethod(draft.id, { name: draft.name, instructions: draft.instructions, enabled: draft.enabled })
    if (ok) setDraft(null)
  }

  const saveReceived = async () => {
    const amount = Number(form.amount)
    if (!form.payer.trim() || !form.method.trim() || !(amount > 0)) return
    const ok = await data.addReceived({ ...form, amount })
    if (ok) setForm(EMPTY_RECEIVED)
  }

  return (
    <div>
      <div className="a-head"><h2>Payments</h2></div>

      <h3 className="a-sub">Waiting for you to check ({waiting.length})</h3>
      <ul className="a-list">
        {waiting.map((p) => (
          <li key={p.id} className="card a-row">
            <div className="a-main">
              <strong>{p.userName} · {p.kind === 'activate' ? 'activation' : 'Premium'} · {money(p.amount, p.currency)}</strong>
              <span className="muted">{p.userEmail} · {p.method} · reference <b>{p.reference}</b></span>
              <blockquote>{p.proof}</blockquote>
            </div>
            <span className="st st-pending">to check</span>
            <div className="a-actions">
              <button className="btn btn-primary" onClick={() => approve(p.id, p.userName)}>Money received, unlock</button>
              <button className="btn" onClick={() => reject(p.id)}>Reject</button>
            </div>
          </li>
        ))}
        {waiting.length === 0 && <li className="empty">Nothing to check right now.</li>}
      </ul>

      <h3 className="a-sub">Ways to pay</h3>
      <p className="muted">Add bank transfer, mobile money or any other method. Writers see the instructions you write here.</p>
      <ul className="a-list">
        {data.methods.map((m) => (
          <li key={m.id} className="card a-row">
            <div className="a-main">
              <strong>{m.name}</strong>
              <span className="pre">{m.instructions}</span>
            </div>
            <span className={`st ${m.enabled ? 'st-approved' : 'st-rejected'}`}>{m.enabled ? 'on' : 'off'}</span>
            <div className="a-actions">
              <button className="btn" onClick={() => setDraft({ ...m })}>Edit</button>
              <button className="btn" onClick={() => data.deleteMethod(m.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {!draft && (
        <>
          <p className="muted">Add one from a template, then replace the (brackets) with your real details:</p>
          <div className="a-actions">
            {TEMPLATES.map((t) => (
              <button key={t.label} className="btn" onClick={() => setDraft({ id: null, name: t.name, instructions: t.instructions, enabled: true })}>
                + {t.label}
              </button>
            ))}
          </div>
        </>
      )}
      {draft && (
        <div className="card a-form">
          <h3>{draft.id ? 'Edit payment method' : 'New payment method'}</h3>
          <label className="field">Name (for example Bank transfer or M-Pesa)
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="field">Instructions for the writer (account details, steps)
            <textarea rows={5} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          </label>
          <label className="a-check">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Show this method to writers
          </label>
          <div className="a-actions">
            <button className="btn btn-primary" onClick={saveMethod}>Save</button>
            <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <h3 className="a-sub">Money received from clients</h3>
      <p className="muted">Record every payment a client makes for their work, by any method. Amounts are in {cfg.currency}.</p>
      <div className="card a-form">
        <div className="a-fields">
          <label className="field">Who paid
            <input value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
          </label>
          <label className="field">Amount ({cfg.currency})
            <input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="field">How (bank, PayPal, M-Pesa…)
            <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
          </label>
          <label className="field">Reference or transaction ID
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </label>
          <label className="field">For which job (optional)
            <select value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
              <option value="">No specific job</option>
              {data.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </label>
          <label className="field">Note (optional)
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>
        <div className="a-actions">
          <button className="btn btn-primary" onClick={saveReceived} disabled={!form.payer.trim() || !form.method.trim() || !(Number(form.amount) > 0)}>
            Record payment
          </button>
        </div>
      </div>
      <ul className="a-list">
        {data.received.map((r) => (
          <li key={r.id} className="card a-row">
            <div className="a-main">
              <strong>{r.payer} · {money(r.amount, r.currency)}</strong>
              <span className="muted">
                {r.method}{r.reference ? ` · ${r.reference}` : ''}{r.jobTitle ? ` · ${r.jobTitle}` : ''} · {new Date(r.createdAt).toLocaleDateString()}
              </span>
              {r.note && <span>{r.note}</span>}
            </div>
          </li>
        ))}
        {data.received.length === 0 && <li className="empty">No client payments recorded yet.</li>}
      </ul>

      <h3 className="a-sub">Writer fees that were paid</h3>
      <ul className="a-list">
        {paid.map((p) => (
          <li key={p.id} className="card a-row">
            <div className="a-main">
              <strong>{p.userName} · {p.kind === 'activate' ? 'activation' : 'Premium'} · {money(p.amount, p.currency)}</strong>
              <span className="muted">{p.method} · {new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
            <span className="st st-approved">paid</span>
          </li>
        ))}
        {paid.length === 0 && <li className="empty">No fees paid yet.</li>}
      </ul>
    </div>
  )
}