import { Link, useParams } from 'react-router-dom'
import useLeaderboard from '../hooks/useLeaderboard.js'
import BadgeList from '../components/BadgeList.jsx'
import StatusPill from '../components/StatusPill.jsx'
import LastUpdated from '../components/LastUpdated.jsx'
import Loader from '../components/Loader.jsx'
import { formatDate, formatNumber } from '../lib/format.js'
import '../styles/components.css'

// One detail page for both tracks. App.jsx passes track="student" or
// track="developer".
export default function StudentPage({ track = 'student' }) {
  const { slug } = useParams()
  const { data, loading, error } = useLeaderboard(track)

  const backTo = track === 'developer' ? '/developers' : '/'
  const backText =
    track === 'developer'
      ? '← Back to developer leaderboard'
      : '← Back to student leaderboard'

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

  const student = data.students.find((s) => s.slug === slug)

  if (!student) {
    return (
      <div className="message-box">
        Not found.
        <br />
        <Link to={backTo}>{backText}</Link>
      </div>
    )
  }

  const { name, rank, progress, points, status, locked, flag, profile_url } =
    student

  return (
    <div>
      <Link to={backTo} className="back-link">
        {backText}
      </Link>

      {flag && <div className="flag-banner">ℹ {flag}</div>}

      <div className="card student-header">
        <div>
          <h1 className="student-name">{name}</h1>
          {locked && (
            <p className="student-locked">
              🔒 Completed all labs on {formatDate(locked.completed_on)}
            </p>
          )}
          {status && status !== 'ok' && <StatusPill status={status} />}
          {profile_url && (
            <p className="student-link">
              <a href={profile_url} target="_blank" rel="noopener noreferrer">
                View public profile ↗
              </a>
            </p>
          )}
        </div>

        <div className="student-stats">
          <div className="stat">
            <span className="stat-value">#{rank}</span>
            <span className="stat-label">Rank</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(points?.total)}</span>
            <span className="stat-label">Points</span>
          </div>
          <div className="stat">
            <span className="stat-value">{progress}</span>
            <span className="stat-label">Labs</span>
          </div>
        </div>
      </div>

      {/* Points breakdown */}
      <div className="card points-breakdown">
        <h3 className="badge-heading">Points breakdown</h3>
        <ul>
          <li>
            <span>Lab badges</span>
            <strong>{formatNumber(points?.syllabus)}</strong>
          </li>
          <li>
            <span>Track bonus</span>
            <strong>{formatNumber(points?.track_bonus)}</strong>
          </li>
          <li>
            <span>Milestone bonus</span>
            <strong>{formatNumber(points?.milestone_bonus)}</strong>
          </li>
        </ul>
      </div>

      <BadgeList
        matched={student.matched}
        missing={student.missing}
        missingItems={student.missing_items}
      />

      <LastUpdated timestamp={data.last_updated} />
    </div>
  )
}