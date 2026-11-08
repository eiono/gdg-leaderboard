import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'
import { countQualified, TOTAL_SPOTS } from '../lib/tiers.js'

// Last known count for each list. It is kept here so the number does not
// disappear for a moment when the visitor switches between the tabs.
const known = {}

// Counts the people with 5+ labs in BOTH lists together, because the 250
// spots are shared by students and faculty.
//
// Arguments:
//   track        'student' or 'developer' (the tab being shown)
//   students     the people of that tab, from the leaderboard data
//   lastUpdated  the `last_updated` text of that data. When it changes, the
//                other list is fetched again.
//
// Returns:
//   ready    false until this tab's data has loaded
//   filled   people with 5+ labs, both lists together
//   shown    filled, but never above the total (so never "260 / 250")
//   left     spots still open
//   total    250
//   closed   true once filled has reached the total
//   partial  true when the other list could not be loaded, so the number
//            only covers one list
export default function useSpotCount({ track, students, lastUpdated }) {
  const other = track === 'developer' ? 'student' : 'developer'
  const [, setVersion] = useState(0)

  const own = Array.isArray(students) ? countQualified(students) : null

  // Remember this tab's number for when the visitor switches tabs
  useEffect(() => {
    if (own !== null) known[track] = own
  }, [track, own])

  // Fetch the other list whenever new data arrives
  useEffect(() => {
    if (!lastUpdated) return undefined
    let cancelled = false

    fetchLeaderboard(other)
      .then((json) => {
        if (cancelled) return
        known[other] = countQualified(json.students || [])
        setVersion((v) => v + 1)
      })
      .catch(() => {
        // Keep the earlier number; the page shows a note if there is none
      })

    return () => {
      cancelled = true
    }
  }, [other, lastUpdated])

  const otherCount = known[other] ?? null
  const filled = (own ?? 0) + (otherCount ?? 0)

  return {
    ready: own !== null,
    filled,
    shown: Math.min(filled, TOTAL_SPOTS),
    left: Math.max(0, TOTAL_SPOTS - filled),
    total: TOTAL_SPOTS,
    closed: filled >= TOTAL_SPOTS,
    partial: own !== null && otherCount === null,
  }
}