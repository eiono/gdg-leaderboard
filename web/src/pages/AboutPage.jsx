import useLeaderboard from '../hooks/useLeaderboard.js'
import Loader from '../components/Loader.jsx'
import { formatDate } from '../lib/format.js'
import '../styles/components.css'

// The syllabus, bonuses and program dates are written into leaderboard.json
// by the scraper (data.syllabus), so this page always matches the real scoring.
export default function AboutPage() {
  const { data, loading, error } = useLeaderboard()

  if (loading) return <Loader text="Loading..." />

  if (error) {
    return (
      <div className="message-box error">
        Could not load data. Please try again later.
        <br />
        <small>{error}</small>
      </div>
    )
  }

  const syllabus = data?.syllabus
  const items = syllabus?.items || []
  const trackBonuses = Object.entries(syllabus?.track_bonuses || {})
  const milestones = syllabus?.milestone_bonuses || []
  const program = syllabus?.program

  return (
    <div className="about">
      <h1>About this leaderboard</h1>

      <section className="card about-section">
        <h2>How it works</h2>
        <p>
          Each student's public Google Cloud Skills profile is checked
          automatically every 6 hours. Badges that match the syllabus below
          earn points, and the leaderboard updates after each check.
        </p>
        {program && (
          <p>
            Only badges earned between{' '}
            <strong>{formatDate(program.start_date)}</strong> and{' '}
            <strong>{formatDate(program.end_date)}</strong> count.
          </p>
        )}
      </section>

      <section className="card about-section">
        <h2>Syllabus and points</h2>
        {items.length === 0 ? (
          <p className="badge-empty">Syllabus will appear after the next update.</p>
        ) : (
          <ul className="about-list">
            {items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </span>
                <strong>{item.points} pts</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(trackBonuses.length > 0 || milestones.length > 0) && (
        <section className="card about-section">
          <h2>Bonus points</h2>
          <ul className="about-list">
            {trackBonuses.map(([track, pts]) => (
              <li key={track}>
                <span>Complete every badge in "{track}"</span>
                <strong>+{pts} pts</strong>
              </li>
            ))}
            {milestones.map((m) => (
              <li key={m.min_matched}>
                <span>Reach {m.min_matched} syllabus badges</span>
                <strong>+{m.points} pts</strong>
              </li>
            ))}
          </ul>
          <p className="about-note">
            Only the highest milestone reached is counted.
          </p>
        </section>
      )}

      <section className="card about-section">
        <h2>Ranking rules</h2>
        <ul className="about-bullets">
          <li>Students are ranked by total points.</li>
          <li>Ties are broken by who reached their latest badge first.</li>
          <li>
            🔒 Once a student completes <strong>every</strong> syllabus badge,
            their position is locked. Locked students are ordered by who
            finished first and are never overtaken.
          </li>
        </ul>
      </section>

      <section className="card about-section">
        <h2>How to join</h2>
        <ul className="about-bullets">
          <li>Make your Skills profile public (profile settings).</li>
          <li>Share your public profile link with the community organizer.</li>
          <li>Your name on the profile should match the name you registered with.</li>
        </ul>
      </section>
    </div>
  )
}