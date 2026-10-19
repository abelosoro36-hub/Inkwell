const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 83) % 100,
  size: 20 + ((i * 37) % 60),
  delay: (i * 1.7) % 12,
  dur: 14 + ((i * 5) % 12),
}))

// Soft floating bubbles behind the whole page.
export default function Bubbles() {
  return (
    <div className="bubbles" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `-${b.delay}s`, animationDuration: `${b.dur}s` }}
        />
      ))}
    </div>
  )
}