import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        Data refreshes automatically every 6 hours from public Google Cloud
        Skills Boost profiles.
      </p>
      <p>
        <Link to="/about">How scoring works</Link>
      </p>
    </footer>
  )
}