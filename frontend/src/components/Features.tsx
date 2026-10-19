import { FEATURES } from '../data'

export default function Features() {
  return (
    <section className="section" id="features">
      <div className="section-head">
        <h2>Everything a writer needs</h2>
        <p>From the first idea to the published piece.</p>
      </div>
      <div className="grid features">
        {FEATURES.map((f) => (
          <article key={f.title} className="card">
            <div className="icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}