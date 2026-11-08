import { useEffect, useRef, useState } from 'react'
import { fetchUpdateStatus, nextUpdateAt } from '../lib/updateStatus.js'

// How often to ask GitHub. Public GitHub calls are limited to 60 per hour
// per IP address (a whole campus can share one), so the site only checks
// often while an update is running or about to start.
const SLOW_MS = 5 * 60 * 1000 // nothing happening
const BUSY_MS = 30 * 1000 // an update or a publish is running
const CHECKING_MS = 10 * 1000 // a 15-minute check is still deciding
const DUE_MS = 60 * 1000 // the countdown is at zero, waiting for the run
const BACKOFF_MS = 15 * 60 * 1000 // GitHub could not be reached

// Ignore a GitHub answer older than this (failed checks, a sleeping tab)
const STALE_MS = 20 * 60 * 1000

// After an update is published, keep saying "Publishing..." until the page
// holds the new data, but never longer than this.
const SETTLE_MS = 3 * 60 * 1000

// Reload the leaderboard data right away, then twice more, because the
// hosting can serve the old file for a minute after a publish.
const RELOAD_DELAYS_MS = [0, 45 * 1000, 120 * 1000]

function delayFor(result, nextAt) {
  if (!result) return BACKOFF_MS
  if (result.phase !== 'idle') return BUSY_MS
  if (result.checking) return CHECKING_MS

  const t = Date.now()
  if (!nextAt) return SLOW_MS
  if (t >= nextAt - 30 * 1000) return DUE_MS

  // Look again shortly before the countdown ends
  return Math.max(5000, Math.min(SLOW_MS, nextAt - 30 * 1000 - t))
}

// Arguments (both optional):
//   lastUpdated   the `last_updated` text from the leaderboard data. The
//                 countdown is this time plus 3 hours.
//   onPublished   called when an update has gone live, so the page can
//                 reload its data (and get a new lastUpdated).
//
// Returns:
//   now, nextAt, msToNext   the countdown (nextAt and msToNext are null until
//                           lastUpdated is known)
//   phase                   'waiting' | 'due' | 'updating' | 'publishing'
//   startedAt, manual       when the running update started, and whether it
//                           was started by hand ("Run workflow")
//   overdueMs               how long past zero the countdown is (0 if not)
//   lastFailureAt           when the last failed update attempt ended
//   available               false when GitHub could not be reached
//
// This hook re-renders its component every second, so use it only inside the
// small UpdateCounter component, never in a whole page.
export default function useUpdateStatus({ lastUpdated = null, onPublished } = {}) {
  const [now, setNow] = useState(() => Date.now())
  const [snapshot, setSnapshot] = useState({ status: null, at: 0 })
  const [settle, setSettle] = useState(null)

  const lastCheck = useRef(0)
  const wasActive = useRef(false)
  const activeSince = useRef(0)
  const reloadTimers = useRef([])
  const lastUpdatedRef = useRef(lastUpdated)
  const onPublishedRef = useRef(onPublished)

  // Keep the latest values available to the timers below
  useEffect(() => {
    lastUpdatedRef.current = lastUpdated
    onPublishedRef.current = onPublished
  })

  // 1. Tick every second for the countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // 2. Ask GitHub now, then again at the pace delayFor() chooses
  useEffect(() => {
    let cancelled = false
    let timer = null
    let controller = null

    function schedule(ms) {
      clearTimeout(timer)
      timer = setTimeout(check, ms)
    }

    function handleFinished(result) {
      // An update that failed publishes nothing, so there is nothing to wait for
      const failed =
        result.lastFailureAt &&
        result.lastFailureAt >= activeSince.current - 60 * 1000
      if (failed) return

      setSettle({
        until: Date.now() + SETTLE_MS,
        base: lastUpdatedRef.current,
      })
      RELOAD_DELAYS_MS.forEach((ms) => {
        reloadTimers.current.push(
          setTimeout(() => onPublishedRef.current?.(), ms)
        )
      })
    }

    async function check() {
      if (cancelled) return

      // Nobody is looking at a hidden tab, so wait until it is shown again
      if (document.hidden) {
        schedule(SLOW_MS)
        return
      }

      controller?.abort()
      controller = new AbortController()
      lastCheck.current = Date.now()

      const result = await fetchUpdateStatus(controller.signal)
      if (cancelled) return

      // On a failure keep the earlier answer; it goes stale on its own
      if (result) {
        setSnapshot({ status: result, at: Date.now() })

        const active =
          result.phase === 'updating' || result.phase === 'publishing'
        if (active && !wasActive.current) activeSince.current = Date.now()
        if (wasActive.current && !active) handleFinished(result)
        wasActive.current = active
      }

      schedule(delayFor(result, nextUpdateAt(lastUpdatedRef.current)))
    }

    function onVisible() {
      // Coming back to the tab: refresh if the last check is a minute old
      if (!document.hidden && Date.now() - lastCheck.current > 60 * 1000) {
        check()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    check()

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller?.abort()
      reloadTimers.current.forEach(clearTimeout)
      reloadTimers.current = []
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // 3. Turn the GitHub answer, the data's time and the clock into one phase
  const fresh = now - snapshot.at < STALE_MS
  const status = fresh ? snapshot.status : null

  const nextAt = nextUpdateAt(lastUpdated)

  // Published, but this page still holds the old data
  const settling =
    settle !== null && now < settle.until && lastUpdated === settle.base

  let phase = 'waiting'
  if (status?.phase === 'updating') {
    phase = 'updating'
  } else if (status?.phase === 'publishing' || settling) {
    phase = 'publishing'
  } else if (nextAt && now >= nextAt) {
    phase = 'due'
  }

  return {
    now,
    nextAt,
    msToNext: nextAt ? nextAt - now : null,
    phase,
    startedAt: status?.startedAt ?? null,
    manual: Boolean(status?.manual),
    overdueMs: nextAt && now > nextAt ? now - nextAt : 0,
    lastFailureAt: status?.lastFailureAt ?? null,
    available: Boolean(status),
  }
}