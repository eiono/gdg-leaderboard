import { Link } from 'react-router-dom'

// Students / Developers switch. `active` tells it which side is selected;
// the leaderboard and detail pages pass it in.
export default function TrackToggle({ active = 'student' }) {
  return (
    <nav className="track-toggle" aria-label="Choose leaderboard">
      <Link
        to="/"
        className={`track-btn${active === 'student' ? ' active' : ''}`}
        aria-current={active === 'student' ? 'page' : undefined}
      >
        Students
      </Link>
      <Link
        to="/developers"
        className={`track-btn${active === 'developer' ? ' active' : ''}`}
        aria-current={active === 'developer' ? 'page' : undefined}
      >
        Faculty
      </Link>
    </nav>
  )
}
