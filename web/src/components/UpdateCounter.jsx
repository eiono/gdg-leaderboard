import useUpdateStatus from '../hooks/useUpdateStatus.js'
import {
  formatClock,
  formatCountdown,
  formatElapsed,
  UPDATE_INTERVAL_HOURS,
} from '../lib/updateStatus.js'

// An update normally takes 6-10 minutes. Past this, say it is taking longer.
const LONG_RUN_MS = 15 * 60 * 1000

// Shows the countdown to the next update, or "Updating..." while one runs.
// Use it once, on the leaderboard page.
export default function UpdateCounter() {
  const {
    now,
    nextAt,
    msToNext,
    phase,
    startedAt,
    manual,
    lastRefresh,
    available,
  } = useUpdateStatus()

  const elapsed = startedAt ? now - startedAt : 0
  const lastFailed = available && lastRefresh && lastRefresh.ok === false

  let label
  let detail = null

  if (phase === 'updating') {
    label = 'Updating…'
    detail =
      elapsed > LONG_RUN_MS
        ? 'Taking longer than usual. The current leaderboard stays visible.'
        : `Started ${formatElapsed(elapsed)} ago · usually takes 6–10 min` +
          (manual ? ' · manual update' : '')
  } else if (phase === 'publishing') {
    label = 'Publishing new data…'
    detail = 'Going live in a minute or two.'
  } else if (phase === 'due') {
    label = 'Update due, starting shortly…'
  } else {
    label = `Next update in ${formatCountdown(msToNext)}`
    detail = `About ${formatClock(nextAt)} IST · every ${UPDATE_INTERVAL_HOURS} hours`
  }

  const busy = phase === 'updating' || phase === 'publishing' || phase === 'due'

  return (
    <div className={`update-counter update-counter--${phase}`}>
      <span
        className={`update-dot${busy ? ' update-dot--busy' : ''}`}
        aria-hidden="true"
      />

      <div className="update-text">
        {/* Only this line is announced to screen readers, and only when the
            phase changes, not on every tick of the countdown */}
        <span className="update-label">
          {busy ? (
            <span aria-live="polite">{label}</span>
          ) : (
            <span aria-hidden="true">{label}</span>
          )}
        </span>

        {detail && <span className="update-detail">{detail}</span>}

        {phase === 'waiting' && lastFailed && (
          <span className="update-warn">
            The last update did not finish, so the data shown is from an
            earlier one.
          </span>
        )}
      </div>
    </div>
  )
}