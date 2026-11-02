import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'

// Loads the leaderboard JSON for one track ('student' or 'developer').
// Returns: { data, loading, error }
// Called with no argument it loads the student leaderboard, so pages that
// have not been updated yet keep working.
export default function useLeaderboard(track = 'student') {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })

    fetchLeaderboard(track)
      .then((json) => {
        if (!cancelled) setState({ data: json, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err.message || 'Something went wrong',
          })
        }
      })

    // Ignore a late response if the user switched tracks or left the page
    return () => {
      cancelled = true
    }
  }, [track])

  return state
}