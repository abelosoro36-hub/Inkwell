export default function Toast({ text }: { text: string | undefined }) {
  if (!text) return null
  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}