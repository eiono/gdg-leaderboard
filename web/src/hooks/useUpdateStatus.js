import { useEffect, useRef, useState } from 'react'
import {
  fetchUpdateStatus,
  nextScheduledUpdate,
  previousScheduledUpdate,
} from '../lib/updateStatus.js'

// How often to ask GitHub. Public, unauthenticated GitHub calls are limited
// to 60 per hour per IP address (a whole campus can share one), so the site
// only checks often while an update is actually running or about to start.
const SLOW_MS = 10 * 60 * 1000 // nothing happening
const BUSY_MS = 30 * 1000 // an update or a deploy is running
const DUE_MS = 60 * 1000 // a scheduled update should be starting
const BACKOFF_MS = 15 * 60 * 1000 // GitHub could not be reached

// A scheduled run can start late. For this long after the slot we say
// "due, starting shortly" until GitHub shows the run.
const DUE_WINDOW_MS = 40 * 60 * 1000

// Ignore a GitHub answer older than this (a failed check, a sleeping tab)
const STALE_MS = 20 * 60 * 1000

function delayFor(result) {
  if (!result) return BACKOFF_MS

  const t = Date.now()
  let base = SLOW_MS

  if (result.phase === 'updating' || result.phase === 'publishing') {
    base = BUSY_MS
  } else {
    const prevSlot = previousScheduledUpdate(t)
    const finished = result.lastRefresh?.finishedAt ?? 0
    if (t - prevSlot < DUE_WINDOW_MS && finished < prevSlot) base = DUE_MS
  }

  // Look again just after the next scheduled slot so the switch to
  // "Updating..." is quick
  const toSlot = nextScheduledUpdate(t) - t + 15 * 1000
  return Math.max(5000, Math.min(base, toSlot))
}

// Returns what the update counter needs:
//   now, nextAt, msToNext   countdown to the next scheduled update
//   phase                   'waiting' | 'due' | 'updating' | 'publishing'
//   startedAt, manual       when the running update started, and whether it
//                           was started by hand ("Run workflow")
//   lastRefresh             { finishedAt, ok } of the last finished update
//   available               false when GitHub could not be reached
//
// This hook re-renders its component every second, so use it only inside
// the small UpdateCounter component, never in a whole page.
export default function useUpdateStatus() {
  const [now, setNow] = useState(() => Date.now())
  const [snapshot, setSnapshot] = useState({ status: null, at: 0 })
  const lastCheck = useRef(0)

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
      if (result) setSnapshot({ status: result, at: Date.now() })
      schedule(delayFor(result))
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
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // 3. Turn the GitHub answer plus the clock into one simple phase
  const fresh = now - snapshot.at < STALE_MS
  const status = fresh ? snapshot.status : null

  const prevSlot = previousScheduledUpdate(now)
  const nextAt = nextScheduledUpdate(now)

  let phase = 'waiting'
  if (status?.phase === 'updating') {
    phase = 'updating'
  } else if (status?.phase === 'publishing') {
    phase = 'publishing'
  } else if (status?.phase === 'idle') {
    const finished = status.lastRefresh?.finishedAt ?? 0
    if (now - prevSlot < DUE_WINDOW_MS && finished < prevSlot) phase = 'due'
  }

  return {
    now,
    nextAt,
    msToNext: nextAt - now,
    phase,
    startedAt: status?.startedAt ?? null,
    manual: Boolean(status?.manual),
    lastRefresh: status?.lastRefresh ?? null,
    available: Boolean(status),
  }
}