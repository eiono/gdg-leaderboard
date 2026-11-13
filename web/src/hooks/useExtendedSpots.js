import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'
import { extendedStatus } from '../lib/suspended.js'

// Counts the Extended spots used (students only). Reloads when new data
// is published (refreshKey changes).
export default function useExtendedSpots(refreshKey) {
  const [state, setState] = useState({
    ready: false,
    used: 0,
    total: 0,
    left: 0,
    closed: false,
  })

  useEffect(() => {
    let alive = true
    fetchLeaderboard('student')
      .then((json) => {
        if (alive) {
          setState({ ready: true, ...extendedStatus(json.students, 'student') })
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [refreshKey])

  return state
}