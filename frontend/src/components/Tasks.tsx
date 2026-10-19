import { LIMIT } from '../api'
import type { ApiJob, Plan } from '../api'

interface Props {
  jobs: ApiJob[]
  plan: Plan
  activateText: string
  claimedIds: string[]
  doneIds: string[]
  slotsUsed: number
  onClaim: (id: string) => void
  onRelease: (id: string) => void
}

export default function Tasks({ jobs, plan, activateText, claimedIds, doneIds, slotsUsed, onClaim, onRelease }: Props) {
  const isFree = plan === 'free'
  const limit = LIMIT[plan]
  const full = !isFree && slotsUsed >= limit

  return (
    <section className="section alt" id="tasks">
      <div className="section-head">
        <h2>Task board</h2>
        <p>
          {isFree
            ? `Claim a task to get started. Your first claim includes the one-time ${activateText} account activation.`
            : `${slotsUsed} of ${limit} task slots in use`}
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="empty">No open tasks right now. Check back soon.</p>
      ) : (
        <div className="grid">
          {jobs.map((t) => {
            const mine = claimedIds.includes(t.id)
            const done = doneIds.includes(t.id)
            const taken = Boolean(t.taken) && !mine
            const premiumOnly = t.premium && plan !== 'premium'

            let action = (
              <button className="btn btn-primary" disabled={premiumOnly || full} onClick={() => onClaim(t.id)}>
                {premiumOnly ? 'Premium only' : full ? 'Slots full' : isFree ? `Claim · activate ${activateText}` : 'Claim task'}
              </button>
            )
            if (taken) action = <button className="btn" disabled>Taken</button>
            if (mine) action = <button className="btn" onClick={() => onRelease(t.id)}>Release</button>
            if (done) action = <button className="btn" disabled>Completed ✓</button>

            return (
              <article key={t.id} className="card task">
                <div className="task-top">
                  <span className="tag">{t.type}</span>
                  {t.premium && <span className="tag gold">Premium</span>}
                </div>
                <h3>{t.title}</h3>
                <p className="muted">{t.client} · {t.words.toLocaleString()} words · due in {t.due}</p>
                <div className="task-foot">
                  <b>${t.pay}</b>
                  {action}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}