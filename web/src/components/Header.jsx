import { Link, NavLink } from 'react-router-dom'

export default function Header() {
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
        </nav>
      </div>
    </header>
  )
}