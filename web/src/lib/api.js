/*import { applyUnlock, applySuspensions } from './suspended.js'

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
    // Unlock first (closes spots after the cutoff), then apply suspensions,
    // which renumbers everyone.
    return applySuspensions(applyUnlock(JSON.parse(text), track), track)
  } catch {
    throw notPublished
  }
}*/

import { applyUnlock, applySuspensions } from './suspended.js'

// Loads the leaderboard JSON written by the scraper.
// track: 'student' (leaderboard.json) or 'developer' (developers.json)
// BASE_URL keeps the path correct locally and on GitHub Pages.
//
// Normal load: a ?t= timestamp stops browsers from showing a stale cached
// copy after a refresh.
// { revalidate: true }: a cheap "has it changed?" check used by the safety
// net. The browser asks the server and gets a tiny "not modified" answer
// when nothing changed, so nothing is downloaded again.
const FILES = {
  student: 'leaderboard.json',
  developer: 'developers.json',
}

export async function fetchLeaderboard(track = 'student', options = {}) {
  const file = FILES[track] || FILES.student
  const base = `${import.meta.env.BASE_URL}data/${file}`
  const revalidate = Boolean(options.revalidate)

  const url = revalidate ? base : `${base}?t=${Date.now()}`
  const res = await fetch(url, { cache: revalidate ? 'no-cache' : 'no-store' })

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
    // Unlock first (closes spots after the cutoff), then apply suspensions,
    // which renumbers everyone.
    return applySuspensions(applyUnlock(JSON.parse(text), track), track)
  } catch {
    throw notPublished
  }
}