import { useEffect, useState } from 'react'

const TEXT =
  'The rain had barely stopped when Amara opened the manuscript again. Somewhere in chapter three, the story was waiting for her to be brave enough to finish it.'

export default function Hero() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((c) => (c > TEXT.length + 25 ? 0 : c + 1)), 55)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <span className="pill">Free sign up · tasks for active writers</span>
        <h1>Serious writers. <em>Perfect work.</em> Happy clients.</h1>
        <p>
          Create a free account, activate it for just $10, and start claiming real writing tasks. Pass our review panel
          to unlock Premium.
        </p>
        <div className="hero-cta">
          <a href="#pricing" className="btn btn-primary">See how it works</a>
          <a href="#studio" className="btn">Try the editor</a>
        </div>
      </div>

      <div className="doc-wrap">
        <div className="doc" aria-hidden="true">
          <div className="doc-bar">
            <i /><i /><i />
            <span>The Salt Road · Chapter 3</span>
            <div className="avatars">
              <b style={{ background: '#f26a3d' }}>A</b>
              <b style={{ background: '#1f8a8a' }}>L</b>
            </div>
          </div>
          <p className="doc-text">
            {TEXT.slice(0, n)}
            <span className="caret" style={{ background: '#f26a3d' }}><small>Amara</small></span>
          </p>
          <p className="doc-text muted">
            “Leo suggests: shorten this opening line.”
            <span className="caret" style={{ background: '#1f8a8a' }}><small>Leo</small></span>
          </p>
        </div>
        <p className="float-bubble b1">Client: “Loved the draft! 🎉”</p>
        <p className="float-bubble b2">Panel score: 9.2 / 10 ⭐</p>
      </div>
    </section>
  )
}