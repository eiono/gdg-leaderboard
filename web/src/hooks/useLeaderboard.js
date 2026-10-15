import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'

// Loads the leaderboard JSON once when a page opens.
// Returns: { data, loading, error }
export default function useLeaderboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchLeaderboard()
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Something went wrong')
          setLoading(false)
        }
      })

    // Stops state updates if the user leaves the page mid-load
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}