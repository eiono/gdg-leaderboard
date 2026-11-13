import { memo } from 'react'
import useUpdateStatus from '../hooks/useUpdateStatus.js'
import useExtendedSpots from '../hooks/useExtendedSpots.js'
import {
  formatClock,
  formatCountdown,
  formatElapsed,
  UPDATE_INTERVAL_HOURS,
} from '../lib/updateStatus.js'
import { FIRST_TIER_LABS } from '../lib/tiers.js'

// An update normally takes 6-10 minutes. Past this, say it is taking longer.
const LONG_RUN_MS = 15 * 60 * 1000

// The "spots left" section. The 250 spots are shared by students and faculty,
// so the count covers both lists. memo() keeps it from redrawing every second
// when the countdown above it ticks.
const Spots = memo(function Spots({ spots, track }) {
  const { ready, shown, left, total, closed, partial } = spots

  if (!ready) return null // this tab's data has not loaded yet

  const percent = Math.min(100, Math.round((shown / total) * 100))
  const otherList = track === 'developer' ? 'student' : 'faculty'

  return (
    <div className="spots">
      {closed ? (
        <span className="spots-main spots-main--closed neon-text">
          {total}/{total} (Limit Exceeded Prize Spot Closed)
        </span>
      ) : (
        <div className="spots-row">
          <span className="spots-main">Spots left: {left}</span>
          <span className="spots-count">
            {shown} / {total} filled
          </span>
        </div>
      )}

      <div
        className="spots-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={shown}
        aria-label="Prize spots filled"
      >
        <div
          className={`spots-fill${closed ? ' spots-fill--full neon-bar' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <span className="spots-note">
        Counts students and faculty together who completed {FIRST_TIER_LABS} or
        more labs
      </span>

      {partial && (
        <span className="update-warn">
          The {otherList} list could not be loaded, so this number may be lower
          than the real total.
        </span>
      )}
    </div>
  )
})

// The Extended Spot counter: 100 more spots for students who finish all
// labs after the first 250 are full.
const ExtendedSpots = memo(function ExtendedSpots({ refreshKey }) {
  const { ready, used, total, left, closed } = useExtendedSpots(refreshKey)

  if (!ready || !total) return null

  const percent = Math.min(100, Math.round((used / total) * 100))

  return (
    <div className="spots spots-extended">
      {closed ? (
        <span className="spots-main spots-main--closed">
          Extended Spot Closed · {total}/{total}
        </span>
      ) : (
        <div className="spots-row">
          <span className="spots-main">Extended Spot left: {left}</span>
          <span className="spots-count">
            {used} / {total} filled
          </span>
        </div>
      )}

      <div
        className="spots-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        aria-label="Extended spots filled"
      >
        <div
          className={`spots-fill spots-fill--extended${closed ? ' spots-fill--full' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <span className="spots-note">
        Provisional Tier
      </span>
    </div>
  )
})

// Shows the countdown to the next update (or "Updating..." while one runs)
// and the prize spots left.
//   lastUpdated   the `last_updated` text from the leaderboard data
//   onPublished   called when new data has gone live, so the page can reload
//   spots         the spot count object from useSpotCount
//   track         'student' or 'developer'
// Use it once, on the leaderboard page.
export default function UpdateCounter({
  lastUpdated,
  onPublished,
  spots,
  track = 'student',
}) {
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
    <div
      className={`update-counter update-counter--${phase} neon-card`}
    >
      <span
        className={`update-dot${busy ? ' update-dot--busy' : ''} neon-dot`}
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

      <Spots spots={spots} track={track} />
      {track === 'student' && spots?.closed && (
        <ExtendedSpots refreshKey={lastUpdated} />
      )}
    </div>
  )
}