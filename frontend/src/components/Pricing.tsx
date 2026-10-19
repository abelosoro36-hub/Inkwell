import type { Plan } from '../api'

interface Props {
  plan: Plan
  activateText: string
  premiumText: string
  onActivate: () => void
  onPremium: () => void
}

export default function Pricing({ plan, activateText, premiumText, onActivate, onPremium }: Props) {
  const isActive = plan !== 'free'

  return (
    <section className="section" id="pricing">
      <div className="section-head">
        <h2>Simple, fair accounts</h2>
        <p>Sign up is free. A small activation keeps tasks with serious writers.</p>
      </div>
      <div className="grid plans">
        <article className="card plan">
          <h3>Free account</h3>
          <p className="price">Free</p>
          <ul>
            <li>Create your profile</li>
            <li>Browse the task board</li>
            <li>Use the writing studio</li>
          </ul>
          <button className="btn" disabled>{plan === 'free' ? 'Your current plan' : 'Included'}</button>
        </article>

        <article className="card plan featured">
          <span className="ribbon">Start here</span>
          <h3>Active writer</h3>
          <p className="price">{activateText} <small>one-time activation</small></p>
          <ul>
            <li>Claim up to 3 tasks at once</li>
            <li>Submit work to clients</li>
            <li>Take the writing test for Premium</li>
          </ul>
          <button className="btn btn-primary" disabled={isActive} onClick={onActivate}>
            {isActive ? 'Activated ✓' : `Activate for ${activateText}`}
          </button>
        </article>

        <article className="card plan">
          <h3>Premium writer</h3>
          <p className="price">{premiumText} <small>after you pass the writing test</small></p>
          <ul>
            <li>No need to finish any tasks first</li>
            <li>Up to 10 tasks at once</li>
            <li>Premium, higher-paying clients</li>
          </ul>
          <button className="btn btn-primary" disabled={plan !== 'eligible'} onClick={onPremium}>
            {plan === 'premium' ? 'Premium ★' : plan === 'eligible' ? `Upgrade for ${premiumText}` : 'Pass the writing test first'}
          </button>
        </article>
      </div>
    </section>
  )
}