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
//   lastUpdated  the `last_updated` text from the leaderboard data
//   onPublished  called when new data has gone live, so the page can reload
// Use it once, on the leaderboard page.
export default function UpdateCounter({ lastUpdated, onPublished }) {
  const {
    now,
    nextAt,
    msToNext,
    phase,
    startedAt,
    manual,
    lastFailureAt,
    available,
  } = useUpdateStatus({ lastUpdated, onPublished })

  const elapsed = startedAt ? now - startedAt : 0
  const dataTime = lastUpdated ? Date.parse(lastUpdated) : 0
  const lastFailed =
    available && lastFailureAt && dataTime && lastFailureAt > dataTime

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
    detail = 'The leaderboard will refresh by itself.'
  } else if (phase === 'due') {
    label = 'Update due, starting shortly…'
    detail = 'Updates are checked every few minutes, so this can take a moment.'
  } else if (nextAt) {
    label = `Next update in ${formatCountdown(msToNext)}`
    detail = `About ${formatClock(nextAt)} IST · ${UPDATE_INTERVAL_HOURS} hours after the last update`
  } else {
    label = 'Checking the update time…'
  }

  const busy = phase === 'updating' || phase === 'publishing' || phase === 'due'

  return (
    <div className={`update-counter update-counter--${phase}`}>
      <span
        className={`update-dot${busy ? ' update-dot--busy' : ''}`}
        aria-hidden="true"
      />

      <div className="update-text">
        {/* Only the changing phase is announced to screen readers, not
            every tick of the countdown */}
        <span className="update-label">
          {busy ? (
            <span aria-live="polite">{label}</span>
          ) : (
            <span aria-hidden="true">{label}</span>
          )}
        </span>

        {detail && <span className="update-detail">{detail}</span>}

        {(phase === 'waiting' || phase === 'due') && lastFailed && (
          <span className="update-warn">
            The last update attempt did not finish, so this data is older than
            it should be. It will try again automatically.
          </span>
        )}
      </div>
    </div>
  )
}