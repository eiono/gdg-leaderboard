// Works out when the next scheduled update is due and whether an update is
// running right now. It asks GitHub's public API about the workflow runs,
// so a manual "Run workflow" shows up here too.

export const GITHUB_OWNER = 'eiono'
export const GITHUB_REPO = 'gdg-leaderboard'

// Must match the cron line in .github/workflows/refresh.yml ("0 */3 * * *").
// It only lines up with the real schedule if it divides 24 (1, 2, 3, 4, 6...).
export const UPDATE_INTERVAL_HOURS = 3

// Workflow names, exactly as written on the "name:" line of each file.
const REFRESH_WORKFLOW = 'Refresh leaderboard'
const DEPLOY_WORKFLOW = 'Deploy site'

const ACTIVE = new Set([
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'pending',
])

const STEP_MS = UPDATE_INTERVAL_HOURS * 60 * 60 * 1000

// The scheduled slots sit on fixed UTC clock times (00:00, 03:00, 06:00, ...),
// which is 05:30, 08:30, 11:30, ... in IST. Epoch time starts at UTC midnight,
// so rounding to a multiple of the interval gives the same slots.
export function previousScheduledUpdate(now = Date.now()) {
  return Math.floor(now / STEP_MS) * STEP_MS
}

export function nextScheduledUpdate(now = Date.now()) {
  return previousScheduledUpdate(now) + STEP_MS
}

// Asks GitHub what is running. Returns one of:
//   { phase: 'updating',   startedAt, manual }   the scraper is running
//   { phase: 'publishing', startedAt }           the site is being redeployed
//   { phase: 'idle',       lastRefresh }         nothing running
//   null                                         GitHub could not be reached
//                                                (offline, rate limit, ...)
export async function fetchUpdateStatus(signal) {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    '/actions/runs?per_page=15'

  let res
  try {
    res = await fetch(url, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch {
    return null
  }
  if (!res.ok) return null

  let json
  try {
    json = await res.json()
  } catch {
    return null
  }

  // GitHub lists the newest runs first
  const runs = json.workflow_runs || []
  const startOf = (r) => Date.parse(r.run_started_at || r.created_at)

  const refreshRuns = runs.filter((r) => r.name === REFRESH_WORKFLOW)
  const deployRuns = runs.filter((r) => r.name === DEPLOY_WORKFLOW)

  const activeRefresh = refreshRuns.find((r) => ACTIVE.has(r.status))
  if (activeRefresh) {
    return {
      phase: 'updating',
      startedAt: startOf(activeRefresh),
      manual: activeRefresh.event === 'workflow_dispatch',
    }
  }

  const activeDeploy = deployRuns.find((r) => ACTIVE.has(r.status))
  if (activeDeploy) {
    return { phase: 'publishing', startedAt: startOf(activeDeploy) }
  }

  const lastDone = refreshRuns.find((r) => r.status === 'completed')
  return {
    phase: 'idle',
    lastRefresh: lastDone
      ? {
          finishedAt: Date.parse(lastDone.updated_at),
          ok: lastDone.conclusion === 'success',
        }
      : null,
  }
}

// 8040000 ms -> "2h 14m", 845000 -> "14m 05s", 42000 -> "42s"
// 8040123 ms -> "2h 14m 03s", 845000 -> "14m 05s", 42000 -> "42s"
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')

  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`
  if (m > 0) return `${m}m ${pad(s)}s`
  return `${s}s`
}

// A time like "8:30 pm", always shown in Indian time
export function formatClock(ms) {
  return new Date(ms).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

// 240000 ms -> "4 min", 20000 -> "under a minute"
export function formatElapsed(ms) {
  const minutes = Math.floor(Math.max(0, ms) / 60000)
  if (minutes < 1) return 'under a minute'
  return `${minutes} min`
}