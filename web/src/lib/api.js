// Fetches the leaderboard JSON written by the scraper.
// BASE_URL keeps the path correct locally and on GitHub Pages.
// The ?t= timestamp stops browsers from showing a stale cached copy
// after the 6-hour refresh.
export async function fetchLeaderboard() {
  const url = `${import.meta.env.BASE_URL}data/leaderboard.json?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    throw new Error(`Could not load leaderboard data (status ${res.status})`)
  }

  return res.json()
}