import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'

// Loads the leaderboard JSON for one track ('student' or 'developer').
// Returns: { data, loading, error, reload }
// reload() fetches the data again quietly (no spinner). If the new fetch
// fails, whatever is on screen stays. Called with no argument it loads the
// student leaderboard, so pages that were not changed keep working.
export default function useLeaderboard(track = 'student') {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const trackRef = useRef(track)

  useEffect(() => {
    trackRef.current = track
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

  const reload = useCallback(async () => {
    const requested = trackRef.current
    try {
      const json = await fetchLeaderboard(requested)
      if (trackRef.current !== requested) return // the user switched tabs

      setState((prev) =>
        // Same data as before: change nothing, so the page does not redraw
        prev.data && prev.data.last_updated === json.last_updated
          ? prev
          : { data: json, loading: false, error: null }
      )
    } catch {
      // Keep showing what is already on screen
    }
  }, [])

  return { ...state, reload }
}