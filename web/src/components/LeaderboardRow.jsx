import { Link } from 'react-router-dom'
import StatusPill from './StatusPill.jsx'
import { formatDate, formatNumber } from '../lib/format.js'
import { getTier } from '../lib/tiers.js'

// The "Tier Status" cell: green for Tier 2, yellow for Tier 1, grey for
// people who are not eligible. Rows past the swag cutoff show a dash.
function TierCell({ student }) {
  if (student.beyond) return <span>–</span>

  const tier = getTier(student)

  if (tier.level === 'none') {
    const showHint = !student.suspended && !student.unlocked
    return (
      <span className="tier-none">
        <span className="tier-pill tier-none-pill">Not eligible</span>
        {showHint && (
          <span className="tier-hint">Complete at least {tier.labs} labs</span>
        )}
      </span>
    )
  }

  const classes = ['tier-pill', `tier-${tier.level}`]
  if (student.flag) classes.push('tier-flagged')

  return (
    <span className={classes.join(' ')}>
      {tier.label} · {tier.reward}
    </span>
  )
}

// One table row. `rank` is the number shown on the site (suspended rows and
// rows past the cutoff have none).
export default function LeaderboardRow({ student, track = 'student' }) {
  const {
    rank,
    slug,
    name,
    progress,
    points,
    status,
    locked,
    flag,
    suspended,
    beyond,
    firstBeyond,
  } = student

  const rowClass = [
    locked ? 'row-locked' : '',
    flag ? 'row-flagged' : '',
    suspended ? 'row-suspended' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {firstBeyond && (
        <tr className="beyond-divider">
        </tr>
      )}

      <tr className={rowClass}>
        <td className="col-rank">{suspended || beyond ? '' : rank}</td>

        <td className="col-name">
          <Link to={`/${track}/${slug}`}>{name}</Link>
          {status && status !== 'ok' && (
            <span className="row-status">
              <StatusPill status={status} />
            </span>
          )}
          {flag && <span className="flag-label">{flag}</span>}
          {suspended && (
            <span className="suspended-reason">
              Reason: Violation of the MCKVIE Code of Conduct
            </span>
          )}
        </td>

        <td className="col-progress">
          {locked ? (
            <span
              className="lock-tag"
              title={`Completed all badges on ${formatDate(locked.completed_on)}`}
            >
              🔒 Completed · {formatDate(locked.completed_on)}
            </span>
          ) : (
            progress
          )}
        </td>

        <td className="col-tier">
          <TierCell student={student} />
        </td>

        <td className="col-points">
          <div className="points-wrap">
            <span>{formatNumber(points?.total)}</span>
            {suspended && (
              <span className="suspended-label">Suspended Permanently</span>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}