import { Link, NavLink } from 'react-router-dom'

// onOpenSwags is passed in by App.jsx and reopens the swags / tiers / rules
// popup. If it is missing, the button is simply not shown.
export default function Header({ onOpenSwags }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="Logo"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <span>Cloud Study Leaderboard</span>
        </Link>

        <nav className="nav">
          <NavLink to="/">Leaderboard</NavLink>
          <NavLink to="/about">About</NavLink>
          {onOpenSwags && (
            <button
              type="button"
              className="swag-open-btn"
              onClick={onOpenSwags}
            >
              🎁 Swags &amp; Rules
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}