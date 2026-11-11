import { Link } from 'react-router-dom'
import StatusPill from './StatusPill.jsx'
import { formatDate, formatNumber } from '../lib/format.js'
import { getTier } from '../lib/tiers.js'

// The "Tier Status" cell: green for Tier 2, yellow for Tier 1, plain white
// for people who have not reached 5 labs yet. A flagged entry still gets its
// real tier, but the pill is shown in red.
function TierCell({ student }) {
  const tier = getTier(student)

  if (student.suspended) {
    return <span className="tier-pill tier-none-pill">Not eligible</span>
  }

  if (tier.level === 'none') {
    return (
      <span className="tier-none">
        <span className="tier-pill tier-none-pill">Not eligible</span>
        <span className="tier-hint">Complete at least {tier.labs} labs</span>
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

// One table row. `rank` is always the official rank from the scraper,
// so it stays correct even when the list is searched or re-sorted.
export default function LeaderboardRow({ student, track = 'student', limited = false }) {
  const { rank, slug, name, progress, points, status, locked, flag, suspended } =
    student

  const rowClass = [
    locked ? 'row-locked' : '',
    flag ? 'row-flagged' : '',
    suspended ? 'row-suspended' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr className={rowClass}>
      <td className="col-rank">{suspended || limited ? '' : rank}</td>

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
            Reason: Violation of the MCKVIE Code of Conduct (Rank Withdrawn)
          </span>
        )}
      </td>

      <td className="col-progress">
        {limited ? null : locked ? (
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
        {limited ? null : <TierCell student={student} />}
      </td>

      <td className="col-points">
        <div className="points-wrap">
          <span>{formatNumber(points?.total)}</span>
          {suspended && (
            <span className="suspended-label">Permanently Suspended</span>
          )}
        </div>
      </td>
    </tr>
  )
}