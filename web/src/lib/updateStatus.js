// Works out when the next scheduled update is due and whether an update is
// running right now. It asks GitHub's public API about the workflow runs,
// so a manual "Run workflow" shows up here too.

export const GITHUB_OWNER = 'eiono'
export const GITHUB_REPO = 'gdg-leaderboard'

// Must match INTERVAL_HOURS in .github/workflows/refresh.yml
export const UPDATE_INTERVAL_HOURS = 3

// Must match the cron line in refresh.yml ("*/15 * * * *")
export const CHECK_EVERY_MINUTES = 15

// Workflow and step names, exactly as written in the two workflow files
const REFRESH_WORKFLOW = 'Refresh leaderboard'
const DEPLOY_WORKFLOW = 'Deploy site'
const WORK_STEPS = ['Set up Python', 'Install dependencies', 'Run scraper']

const ACTIVE = new Set([
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'pending',
])

const INTERVAL_MS = UPDATE_INTERVAL_HOURS * 60 * 60 * 1000
const API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`

// Next update = last update + 3 hours. Accepts the ISO text from
// leaderboard.json or a number of milliseconds. Returns null if unknown.
export function nextUpdateAt(lastUpdated) {
  if (!lastUpdated) return null
  const t =
    typeof lastUpdated === 'number' ? lastUpdated : Date.parse(lastUpdated)
  return Number.isNaN(t) ? null : t + INTERVAL_MS
}

async function getJson(url, signal) {
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const startOf = (run) => Date.parse(run.run_started_at || run.created_at)

// Tells a real update apart from a 15-minute check that found nothing to do.
//   'real'     the update steps are running or have run
//   'skipped'  the check decided it was not due yet
//   'unknown'  too early to tell (the check is still deciding)
async function classifyRefreshRun(run, signal) {
  // A manual "Run workflow" always updates
  if (run.event === 'workflow_dispatch') return 'real'

  const json = await getJson(`${API}/actions/runs/${run.id}/jobs`, signal)
  const job = json?.jobs?.[0]
  if (!job) return 'unknown'

  const work = (job.steps || []).filter((s) => WORK_STEPS.includes(s.name))

  const ran = work.some(
    (s) =>
      s.status === 'in_progress' ||
      (s.status === 'completed' && s.conclusion !== 'skipped')
  )
  if (ran) return 'real'

  const allSkipped =
    work.length === WORK_STEPS.length &&
    work.every((s) => s.status === 'completed' && s.conclusion === 'skipped')
  return allSkipped ? 'skipped' : 'unknown'
}

// Asks GitHub what is happening. Returns one of:
//   { phase: 'updating',   startedAt, manual }   the scraper is running
//   { phase: 'publishing', startedAt }           new data is being published
//   { phase: 'idle', checking, lastFailureAt }   nothing running
//        checking: true   a check is running and has not decided yet, so look
//                         again in a few seconds
//        lastFailureAt    when the last failed update attempt ended (or null)
//   null                                         GitHub could not be reached
export async function fetchUpdateStatus(signal) {
  const json = await getJson(`${API}/actions/runs?per_page=30`, signal)
  if (!json) return null

  // GitHub lists the newest runs first
  const runs = json.workflow_runs || []
  const refreshRuns = runs.filter((r) => r.name === REFRESH_WORKFLOW)

  // 1. Is an update running? (at most one runs and one waits at a time)
  let checking = false
  for (const run of refreshRuns.filter((r) => ACTIVE.has(r.status))) {
    const kind = await classifyRefreshRun(run, signal)
    if (kind === 'real') {
      return {
        phase: 'updating',
        startedAt: startOf(run),
        manual: run.event === 'workflow_dispatch',
      }
    }
    if (kind === 'unknown') checking = true
  }

  // 2. Is new data being published? Only deploys started by an update (or
  //    by hand) count, not deploys caused by a code change.
  const deploy = runs.find(
    (r) =>
      r.name === DEPLOY_WORKFLOW &&
      r.event === 'workflow_dispatch' &&
      ACTIVE.has(r.status)
  )
  if (deploy) return { phase: 'publishing', startedAt: startOf(deploy) }

  // 3. Nothing running. Remember a recent failed attempt so the page can say
  //    that the data shown is older than it should be.
  const failed = refreshRuns.find(
    (r) => r.status === 'completed' && r.conclusion === 'failure'
  )
  return {
    phase: 'idle',
    checking,
    lastFailureAt: failed ? Date.parse(failed.updated_at) : null,
  }
}

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