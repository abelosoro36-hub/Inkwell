export default function Footer() {
  return (
    <footer className="footer">
      <h2>Your next chapter starts today.</h2>
      <a href="#studio" className="btn btn-primary">Start writing free</a>
      <p>© {new Date().getFullYear()} Inkwell. Made for writers.</p>
    </footer>
  )
}