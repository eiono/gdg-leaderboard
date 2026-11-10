import { applySuspensions } from './suspended.js'

// Loads the leaderboard JSON written by the scraper.
// track: 'student' (leaderboard.json) or 'developer' (developers.json)
// BASE_URL keeps the path correct locally and on GitHub Pages.
// The ?t= timestamp stops browsers from showing a stale cached copy
// after a refresh.
const FILES = {
  student: 'leaderboard.json',
  developer: 'developers.json',
}

export async function fetchLeaderboard(track = 'student') {
  const file = FILES[track] || FILES.student
  const url = `${import.meta.env.BASE_URL}data/${file}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })

  const notPublished = new Error(
    track === 'developer'
      ? 'The developer leaderboard has not been published yet.'
      : 'The leaderboard data has not been published yet.'
  )

  if (res.status === 404) throw notPublished
  if (!res.ok) {
    throw new Error(`Could not load leaderboard data (status ${res.status})`)
  }

  // A dev server (or some hosts) answers a missing file with the site's
  // HTML page instead of a 404, so check what actually came back.
  const text = await res.text()
  try {
    return applySuspensions(JSON.parse(text), track)
  } catch {
    throw notPublished
  }
}