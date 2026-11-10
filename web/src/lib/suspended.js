// People who are removed from the rankings for breaking the code of conduct.
//
// Each entry needs the person's public profile link, exactly as it appears
// in the leaderboard data. `track` is 'student' or 'developer' (the faculty
// tab). To remove someone from this list, delete their line and push again.
export const SUSPENDED = [
  { track: 'student', profile_url: 'https://www.skills.google/public_profiles/b18c1c53-3705-4085-a0aa-466186f9e4a4' },
  { track: 'student', profile_url: 'https://www.skills.google/public_profiles/d6ed0ea5-a4df-4df1-86ea-2832bafaaf48' },
]

// The red text shown at the bottom right of their row
export const SUSPENDED_LABEL = 'Suspended'
export const SUSPENDED_REASON = 'Broke the code of conduct'

// Makes two spellings of the same link compare equal
function cleanUrl(url) {
  return String(url || '')
    .trim()
    .toLowerCase()
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '')
}

// Takes the leaderboard data and returns a copy where:
//  - suspended people keep their row but have no rank (rank is null),
//  - their lock is removed (on screen only),
//  - everyone else is numbered again, skipping them (1, 2, 3, ...).
// `listRank` keeps the original position, so sorting never moves a row.
export function applySuspensions(json, track) {
  if (!json || !Array.isArray(json.students)) return json

  const blocked = new Set(
    SUSPENDED.filter((e) => !e.track || e.track === track).map((e) =>
      cleanUrl(e.profile_url)
    )
  )

  const ordered = [...json.students].sort(
    (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)
  )

  let next = 0
  const students = ordered.map((s) => {
    const listRank = s.rank

    if (blocked.has(cleanUrl(s.profile_url))) {
      return { ...s, listRank, rank: null, suspended: true, locked: null }
    }

    next += 1
    return { ...s, listRank, rank: next, suspended: false }
  })

  return { ...json, students }
}