const FAQ = [
  { q: 'Why is there a $10 activation?', a: 'Sign up is free. The one-time activation keeps the board for serious writers, so clients get careful work and idle accounts do not hold tasks.' },
  { q: 'What happens after I activate?', a: 'You can claim up to 3 tasks at once, write them in My work, and send them for review.' },
  { q: 'How is my work reviewed?', a: 'Our panel reads each submission. They can approve it, ask for a revision, or reject it. You can fix and resubmit when changes are requested.' },
  { q: 'How do I become Premium?', a: 'After your sample is approved by the panel you can upgrade for $15. Premium allows up to 10 tasks and opens higher-paying premium tasks.' },
  { q: 'When do I get paid?', a: 'Approved work is added to your earnings. The payout method and schedule will be shown here once they are set up.' },
]

export default function Faq() {
  return (
    <section className="section" id="faq">
      <div className="section-head">
        <h2>Questions, answered</h2>
      </div>
      <div className="faq">
        {FAQ.map((x) => (
          <details key={x.q}>
            <summary>{x.q}</summary>
            <p>{x.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}